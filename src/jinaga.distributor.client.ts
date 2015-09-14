import engine = require("engine.io-client");
import Socket = engine.Socket;
import Interface = require("./interface");
import NetworkProvider = Interface.NetworkProvider;
import Query = Interface.Query;
import Coordinator = Interface.Coordinator;

class JinagaDistributor implements NetworkProvider {
    socket: Socket;
    coordinator: Coordinator;

    constructor(
        endpoint: string
    ) {
        this.socket = new Socket(endpoint);
        this.socket.on("message", this.onMessage.bind(this));
    }

    public init(coordinator: Coordinator) {
        this.coordinator = coordinator;
    }

    public watch(start: Object, query: Query) {
        this.socket.send(JSON.stringify({
            type: "watch",
            start: start,
            query: query.toDescriptiveString()
        }));
    }

    public fact(fact: Object) {
        this.socket.send(JSON.stringify({
            type: "fact",
            fact: fact
        }));
    }

    private onMessage(message) {
        var messageObj = JSON.parse(message);
        if (messageObj.type === "fact") {
            this.coordinator.onReceived(messageObj.fact, this);
        }
    }
}

export = JinagaDistributor;
