import Engine = require("engine.io");
import Debug = require("debug");
import Interface = require("./interface");
import Query = Interface.Query;
import PersistenceProvider = Interface.PersistenceProvider;
import Coordinator = Interface.Coordinator;
import computeHash = Interface.computeHash;
import QueryInverter = require("./queryInverter");
import Inverse = QueryInverter.Inverse;
import Collections = require("./collections");
import _isEqual = Collections._isEqual;
import _some = Collections._some;
import FactChannel = require("./factChannel");
import splitSegments = require('./querySegmenter');

var debug = Debug("jinaga.distributor.server");

class Watch {
    constructor(
        public start: Object,
        public query: string,
        public affected: Query
    ) {}
}

class Promise {
    private isDone: boolean = false;
    private whenDone: Array<() => void> = [];

    public done() {
        this.isDone = true;
        this.whenDone.forEach(a => a());
    }

    public static whenAll(promises: Promise[], action: () => void) {
        const pending = promises.filter(p => !p.isDone);
        if (pending.length === 0) {
            action();
        }
        else {
            pending.forEach(p => {
                p.whenDone.push(() => {
                    const index = promises.indexOf(p);
                    if (index >= 0)
                        promises.splice(index, 1);
                    if (promises.length === 0)
                        action();
                });
            });
        }
    }
}

class JinagaConnection implements Interface.Spoke {
    private watches: Array<Watch> = [];
    private userFact: Object;
    private identicon: string;
    private channel: FactChannel;
    private partialQueries: { [start: number]: { [query: string]: Promise }} = {};

    constructor(
        private socket,
        private distributor: JinagaDistributor)
    {
        this.channel = new FactChannel(2,
            message => {
                debug("[" + this.identicon + "] Sending " + JSON.stringify(message.fact));
                this.socket.send(JSON.stringify(message));
            },
            fact => { this.distributor.onReceived(fact, this.userFact, this); });
        socket.on("message", this.onMessage.bind(this));
        socket.on("close", this.onClose.bind(this));

        this.identicon = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for( var i=0; i < 5; i++ )
            this.identicon += possible.charAt(Math.floor(Math.random() * possible.length));

        debug("[" + this.identicon + "] Connected");
    }

    setUser(
        userFact: Object,
        profile: Object
    ) {
        this.userFact = userFact;
        this.socket.send(JSON.stringify({
            type: "loggedIn",
            userFact: userFact,
            profile: profile
        }));
    }

    private onMessage(message) {
        try {
            var messageObj = JSON.parse(message);
            if (messageObj.type === "watch") {
                this.watch(messageObj);
            }
            else if (messageObj.type === "stop") {
                this.stop(messageObj);
            }
            else if (messageObj.type === "query") {
                this.query(messageObj);
            }
            else if (messageObj.type === "fact") {
                this.fact(messageObj);
            }
            else {
                throw new Error("Unexpected message type");
            }
        }
        catch (x) {
            debug("[" + this.identicon + "] Error " + x.message + ' -- Parsing "' + message + '"');
        }
    }

    private onClose() {
        debug("[" + this.identicon + "] Closed");
        this.distributor.onClose(this);
    }

    private watch(message) {
        if (!message.start || !message.query)
            return;

        try {
            var query = Interface.fromDescriptiveString(message.query);
            var inverses = QueryInverter.invertQuery(query);
            inverses.forEach((inverse: Inverse) => {
                this.watches.push(new Watch(message.start, message.query, inverse.affected));
            });
            this.executeQuerySegments(message.start, message.token, query);
        }
        catch (x) {
            debug(x.message);
        }
    }

    private stop(message) {
        if (!message.start || !message.query)
            return;

        try {
            for(var index = this.watches.length-1; index >= 0; index--) {
                if (_isEqual(this.watches[index].start, message.start) &&
                    this.watches[index].query === message.query
                ) {
                    this.watches.splice(index, 1);
                }
            }
        }
        catch (x) {
            debug(x.message);
        }
    }

    private query(message) {
        if (!message.start || !message.query || !message.token)
            return;

        try {
            var query = Interface.fromDescriptiveString(message.query);
            this.executeQuerySegments(message.start, message.token, query);
        }
        catch (x) {
            debug(x.message);
        }
    }

    private fact(message) {
        if (!message.fact)
            return;

        debug("[" + this.identicon + "] Received " + JSON.stringify(message.fact));
        this.channel.messageReceived(message);
        this.socket.send(JSON.stringify({
            type: "received",
            token: message.token
        }));
    }

    distribute(fact: Object) {
        this.watches.forEach((watch) => {
            this.distributor.executeParialQuery(fact, watch.affected, this.userFact, (error: string, affected: Array<Object>) => {
                if (error) {
                    debug(error);
                    return;
                }
                var some: any = _some;
                if (some(affected, (obj: Object) => _isEqual(obj, watch.start))) {
                    this.channel.sendFact(fact);
                }
            });
        });
    }

    private executeQuerySegments(start: Object, token: any, query: Query) {
        const segments: Query[] = splitSegments(query);
        const promises = segments.map(segment => {
            return this.getPartialQuery(start, segment);
        });
        Promise.whenAll(promises, () => {
            this.socket.send(JSON.stringify({
                type: "done",
                token: token
            }));
        });
    }

    private getPartialQuery(start: Object, query: Query): Promise {
        const hash = computeHash(start);
        let queries = this.partialQueries[hash];
        if (!queries) {
            queries = {};
            this.partialQueries[hash] = queries;
        }
        const descriptiveString = query.toDescriptiveString();
        let partialQuery = queries[descriptiveString];
        if (!partialQuery) {
            partialQuery = new Promise();
            queries[descriptiveString] = partialQuery;

            this.distributor.executeParialQuery(start, query, this.userFact, (error: string, results: Array<Object>) => {
                if (error) {
                    debug("[" + this.identicon + "] Error " + error);
                    this.socket.close();
                    this.distributor.onClose(this);
                }
                else {
                    results.forEach((result: Object) => {
                        this.channel.sendFact(result);
                    });
                }
                partialQuery.done();
            });
        }

        return partialQuery;
    }
}

class JinagaDistributor implements Coordinator {
    server: Engine;
    connections: Array<Interface.Spoke> = [];

    constructor(
        private storage: PersistenceProvider,
        private keystore: Interface.KeystoreProvider,
        private authenticate: (socket: any, done: (user: Object) => void) => void)
    {
        if (!this.authenticate) {
            this.authenticate = (socket: any, done: (user: Object) => void) => {
                done(null);
            };
        }
        storage.init(this);
    }

    static listen(storage: PersistenceProvider, keystore: Interface.KeystoreProvider, port: number, authenticate: (socket: any, done: (user: Object) => void) => void): JinagaDistributor {
        var distributor = new JinagaDistributor(storage, keystore, authenticate);
        distributor.server = Engine.listen(port);
        debug("Listening on port " + port);
        distributor.start();
        return distributor;
    }

    static attach(storage: PersistenceProvider, keystore: Interface.KeystoreProvider, http, authenticate: (req: any, done: (user: Object) => void) => void): JinagaDistributor {
        var distributor = new JinagaDistributor(storage, keystore, (socket: any, done: (user: Object) => void) => {
            authenticate(socket.request, done);
        });
        distributor.server = Engine.attach(http);
        debug("Attached to HTTP server");
        distributor.start();
        return distributor;
    }

    private start() {
        this.server.on("connection", this.onConnection.bind(this));
    }
    
    connect(spoke: Interface.Spoke) {
        this.connections.push(spoke);
    }

    onConnection(socket) {
        var connection = new JinagaConnection(socket, this);
        this.authenticate(socket, (user: Interface.UserIdentity) => {
            if (user) {
                this.keystore.getUserFact(user, (userFact: Object) => {
                    connection.setUser(userFact, user.profile);
                    this.connections.push(connection);
                });
            }
            else {
                this.connections.push(connection);
            }
        });
    }

    onClose(connection: JinagaConnection) {
        var index = this.connections.indexOf(connection);
        if (index > -1) {
            this.connections.splice(index, 1);
        }
    }
    
    executeParialQuery(
        start: Object,
        query: Query,
        readerFact: Object,
        result: (error: string, facts: Array<Object>) => void
    ) {
        this.storage.executePartialQuery(start, query, (error, facts) => {
            if (error)
                result(error, null);
            else
                result(null, facts.filter(f => { return this.authorizeRead(f, readerFact); }));
        });
    }

    send(fact: Object, sender: any) {
        this.connections.forEach((connection: Interface.Spoke) => {
            if (connection !== sender)
                connection.distribute(fact);
        });
    }

    onReceived(fact: Object, userFact: Object, source: any) {
        if (this.authorizeWrite(fact, userFact))
            this.storage.save(fact, source);
    }

    onDelivered(token:number, destination:any) {
        // TODO: Remove the fact from the queue of messages bound for this client.
    }

    onSaved(fact:Object, source:any) {
        this.send(fact, source);
    }

    onDone(token:number) {
    }

    onProgress(queueCount:number) {
    }

    onError(err: string) {
        debug(err);
    }

    onLoggedIn(userFact:Object) {
    }

    resendMessages() {
    }

    private authorizeRead(fact: Object, readerFact: Object) {
        if (!fact.hasOwnProperty("in")) {
            // Not in a locked fact
            return true;
        }
        var locked = fact["in"];
        if (!locked.hasOwnProperty("from")) {
            // Locked fact is not from a user, so no one has access
            return false;
        }
        var owner = locked["from"];
        if (_isEqual(owner, readerFact)) {
            // The owner has access.
            return true;
        }
        return false;
    }

    private authorizeWrite(fact, userFact): boolean {
        if (fact.hasOwnProperty("from")) {
            if (!_isEqual(userFact, fact["from"])) {
                // Impersonating another user.
                return false;
            }
        }
        if (fact.hasOwnProperty("in")) {
            var locked = fact["in"];
            if (!locked.hasOwnProperty("from")) {
                // Locked facts must have an original user.
                return false;
            }
            if (!_isEqual(locked["from"], userFact)) {
                // Not the original user.
                return false;
            }
        }
        return true;
    }
}

export = JinagaDistributor;
