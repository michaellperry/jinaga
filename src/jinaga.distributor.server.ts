import Engine = require("engine.io");
import Debug = require("debug");
import Interface = require("./interface");
import Query = Interface.Query;
import StorageProvider = Interface.StorageProvider;
import Coordinator = Interface.Coordinator;
import QueryInverter = require("./queryInverter");
import Inverse = QueryInverter.Inverse;
import Collections = require("./collections");
import _isEqual = Collections._isEqual;
import _some = Collections._some;

var debug = Debug("jinaga.distributor.server");

class Watch {
    constructor(
        public start: Object,
        public affected: Query,
        public userFact: Object
    ) {}
}

class JinagaConnection {
    socket;
    distributor: JinagaDistributor;
    watches: Array<Watch> = [];
    private userFact: Object;

    constructor(
        socket,
        distributor: JinagaDistributor)
    {
        this.socket = socket;
        this.distributor = distributor;
        socket.on("message", this.onMessage.bind(this));
        socket.on("close", this.onClose.bind(this));
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
        debug("Received message: " + message);
        var messageObj = JSON.parse(message);
        if (messageObj.type === "watch") {
            this.watch(messageObj);
        }
        else if (messageObj.type === "query") {
            this.query(messageObj);
        }
        else if (messageObj.type === "fact") {
            this.fact(messageObj);
        }
    }

    private onClose() {
        debug("Connection closed");
    }

    private watch(message) {
        if (!message.start || !message.query)
            return;

        debug("Begin watch");
        try {
            var query = Interface.fromDescriptiveString(message.query);
            // TODO: This is incorrect. Each segment of the query should be executed.
            this.distributor.storage.executeQuery(message.start, query, this.userFact, (error: string, results: Array<Object>) => {
                results.forEach((result: Object) => {
                    debug("Sending result");
                    this.socket.send(JSON.stringify({
                        type: "fact",
                        fact: result
                    }));
                });
            });
            var inverses = QueryInverter.invertQuery(query);
            inverses.forEach((inverse: Inverse) => {
                this.watches.push(new Watch(message.start, inverse.affected, this.userFact));
            });
        }
        catch (x) {
            debug(x.message);
        }
    }

    private query(message) {
        if (!message.start || !message.query || !message.token)
            return;

        debug("Begin query");
        try {
            var query = Interface.fromDescriptiveString(message.query);
            // TODO: This is incorrect. Each segment of the query should be executed.
            this.distributor.storage.executeQuery(message.start, query, this.userFact, (error: string, results: Array<Object>) => {
                results.forEach((result: Object) => {
                    debug("Sending result");
                    this.socket.send(JSON.stringify({
                        type: "fact",
                        fact: result
                    }));
                });
                debug("Done with query");
                this.socket.send(JSON.stringify({
                    type: "done",
                    token: message.token
                }));
            });
        }
        catch (x) {
            debug(x.message);
        }
    }

    private fact(message) {
        if (!message.fact)
            return;

        debug("Received fact from " + this.socket.id);
        this.distributor.onReceived(message.fact, this.userFact, this);
    }

    distribute(fact: Object) {
        debug("Distributing to " + this.socket.id);
        this.watches.forEach((watch) => {
            this.distributor.storage.executeQuery(fact, watch.affected, watch.userFact, (error: string, affected: Array<Object>) => {
                if (error) {
                    debug(error);
                    return;
                }
                var some: any = _some;
                if (some(affected, (obj: Object) => _isEqual(obj, watch.start))) {
                    debug("Sending fact");
                    this.socket.send(JSON.stringify({
                        type: "fact",
                        fact: fact
                    }));
                }
                else {
                    debug("No match");
                }
            });
        });
    }
}

class JinagaDistributor implements Coordinator {
    server: Engine;
    connections: Array<JinagaConnection> = [];

    constructor(
        public storage: StorageProvider,
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

    static listen(storage: StorageProvider, keystore: Interface.KeystoreProvider, port: number, authenticate: (socket: any, done: (user: Object) => void) => void): JinagaDistributor {
        var distributor = new JinagaDistributor(storage, keystore, authenticate);
        distributor.server = Engine.listen(port);
        debug("Listening on port " + port);
        distributor.start();
        return distributor;
    }

    static attach(storage: StorageProvider, keystore: Interface.KeystoreProvider, http, authenticate: (req: any, done: (user: Object) => void) => void): JinagaDistributor {
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

    onConnection(socket) {
        debug("Connection established");
        var connection = new JinagaConnection(socket, this);
        this.authenticate(socket, (user: Interface.UserIdentity) => {
            this.keystore.getUserFact(user, (userFact: Object) => {
                connection.setUser(userFact, user.profile);
                this.connections.push(connection);
            });
        });
    }

    send(fact: Object, sender: any) {
        this.connections.forEach((connection: JinagaConnection) => {
            if (connection !== sender)
                connection.distribute(fact);
        });
    }

    onReceived(fact: Object, userFact: Object, source: any) {
        if (this.authorizeWrite(fact, userFact))
            this.storage.save(fact, source);
   }

    onSaved(fact:Object, source:any) {
        this.send(fact, source);
    }

    onDone(token:number) {
    }

    onError(err: string) {
        debug(err);
    }

    onLoggedIn(userFact:Object) {
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
