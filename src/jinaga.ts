import Interface = require("interface");
import Join = Interface.Join;
import StorageProvider = Interface.StorageProvider;

class Inverse {
    constructor(
        public targets: Array<Join>,
        public added: Array<Join>,
        public removed: Array<Join>) {
    }
}

class Query {
    constructor(
        public start: Object,
        public joins: Array<Join>,
        public resultAdded: (message: Object) => void,
        public resultRemoved: (message: Object) => void,
        public inverses: Array<Inverse>) {
    }
}

class Jinaga {
    private queries: Array<Query> = new Array<Query>();
    private messages: Object[] = [];

    public save(storage: StorageProvider) {
    }

    public fact(message: Object) {
        this.messages.push(message);

        for (var i = 0; i < this.queries.length; i++) {
            this.queries[i].resultAdded(message);
        }
    }

    public query(
        start: Object,
        templates: Array<(target: Object) => Object>,
        resultAdded: (result: Object) => void,
        resultRemoved: (result: Object) => void) {

        this.queries.push(new Query(
            start,
            [],
            resultAdded,
            resultRemoved,
            []));

        for (var i = 0; i < this.messages.length; i++) {
            resultAdded(this.messages[i]);
        }
    }
}

export = Jinaga;
