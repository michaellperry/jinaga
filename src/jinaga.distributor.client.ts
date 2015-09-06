import engine = require("engine.io-client");
import Socket = engine.Socket;
import Interface = require("./interface");
import NetworkProvider = Interface.NetworkProvider;
import Query = Interface.Query;

class JinagaDistributor implements NetworkProvider {
    socket: Socket;
    factReceived: (message: Object) => void;

    constructor(
        endpoint: string
    ) {
        this.socket = new Socket(endpoint);
        this.socket.on("message", this.onMessage.bind(this));
    }

    public connect(factReceived: (message: Object) => void) {
        this.factReceived = factReceived;
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
            this.factReceived(messageObj.fact);
        }
    }
}

export = JinagaDistributor;
