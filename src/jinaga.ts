import Interface = require("interface");
import Join = Interface.Join;
import StorageProvider = Interface.StorageProvider;
import Proxy = Interface.Proxy;
import parse = require("./queryParser");
import MemoryProvider = require("./memory");
import _ = require("lodash");

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
    private queries: Array<Query> = [];
    private messages: StorageProvider = new MemoryProvider();

    public save(storage: StorageProvider) {
        this.messages = storage;
    }

    public fact(message: Object) {
        var queries = this.queries;
        this.messages.save(message, function () {
            for (var i = 0; i < queries.length; i++) {
                queries[i].resultAdded(message);
            }
        });
    }

    public watch(
        start: Object,
        templates: Array<(target: Proxy) => Object>,
        resultAdded: (result: Object) => void,
        resultRemoved: (result: Object) => void) {

        var joins = parse(templates);
        this.queries.push(new Query(
            start,
            joins,
            resultAdded,
            resultRemoved,
            []));

        this.messages.executeQuery(start, joins, function(error, results) {
            _.each(results, resultAdded);
        });
    }
}

export = Jinaga;
