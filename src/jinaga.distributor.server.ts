import Engine = require("engine.io");
import Debug = require("debug");
import Interface = require("./interface");
import Query = Interface.Query;
import StorageProvider = Interface.StorageProvider;
import Coordinator = Interface.Coordinator;
import QueryInverter = require("./queryInverter");
import Inverse = QueryInverter.Inverse;

var debug = Debug("jinaga.distributor.server");

class Watch {
    constructor(
        public start: Object,
        public affected: Query
    ) {}
}

class JinagaConnection {
    socket;
    distributor: JinagaDistributor;
    watches: Array<Watch> = [];

    constructor(socket, distributor: JinagaDistributor) {
        this.socket = socket;
        this.distributor = distributor;
        socket.on("message", this.onMessage.bind(this));
        socket.on("close", this.onClose.bind(this));
    }

    private onMessage(message) {
        debug("Received message: " + message);
        var messageObj = JSON.parse(message);
        if (messageObj.type === "watch") {
            this.watch(messageObj);
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
            this.distributor.storage.executeQuery(message.start, query, function (error: string, results: Array<Object>) {
                results.forEach(function (result: Object) {
                    debug("Sending result");
                    this.socket.send(JSON.stringify({
                        type: "fact",
                        fact: result
                    }));
                }, this);
            }, this);
            var inverses = QueryInverter.invertQuery(query);
            inverses.forEach(function (inverse: Inverse) {
                this.watches.push(new Watch(message.start, inverse.affected));
            }, this);
        }
        catch (x) {
            debug(x.message);
        }
    }

    private fact(message) {
        if (!message.fact)
            return;

        debug("Received fact from " + this.socket.id);
        this.distributor.onReceived(message.fact, this);
    }

    distribute(fact: Object) {
        debug("Distributing to " + this.socket.id);
        this.watches.forEach(function(watch) {
            this.distributor.storage.executeQuery(fact, watch.affected, function (error: string, affected: Array<Object>) {
                if (error) {
                    debug(error);
                    return;
                }
                var some: any = Interface._some;
                if (some(affected, (obj: Object) => Interface._isEqual(obj, watch.start))) {
                    debug("Sending fact");
                    this.socket.send(JSON.stringify({
                        type: "fact",
                        fact: fact
                    }));
                }
                else {
                    debug("No match");
                }
            }, this);
        }, this);
    }
}

class JinagaDistributor implements Coordinator {
    server: Engine;
    connections: Array<JinagaConnection> = [];

    constructor(public storage: StorageProvider) {
        storage.init(this);
    }

    static listen(storage: StorageProvider, port: number): JinagaDistributor {
        var distributor = new JinagaDistributor(storage);
        distributor.server = Engine.listen(port);
        debug("Listening on port " + port);
        distributor.start();
        return distributor;
    }

    private start() {
        this.server.on("connection", this.onConnection.bind(this));
    }

    onConnection(socket) {
        debug("Connection established");
        this.connections.push(new JinagaConnection(socket, this));
    }

    send(fact: Object, sender: any) {
        this.connections.forEach(function (connection: JinagaConnection) {
            if (connection !== sender)
                connection.distribute(fact);
        }, this);
    }

    onReceived(fact: Object, source: any) {
        this.storage.save(fact, source);
    }


    onSaved(fact:Object, source:any) {
        this.send(fact, source);
    }

    onError(err: string) {
        debug(err);
    }
}

export = JinagaDistributor;
