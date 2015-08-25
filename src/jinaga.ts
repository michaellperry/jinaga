import Interface = require("interface");
import Query = Interface.Query;
import StorageProvider = Interface.StorageProvider;
import Proxy = Interface.Proxy;
import parse = require("./queryParser");
import MemoryProvider = require("./memory");
import _ = require("lodash");

class Inverse {
    constructor(
        public targets: Query,
        public added: Query,
        public removed: Query) {
    }
}

class Watch {
    constructor(
        public start: Object,
        public joins: Query,
        public resultAdded: (message: Object) => void,
        public resultRemoved: (message: Object) => void,
        public inverses: Array<Inverse>) {
    }
}

class Jinaga {
    private watches: Array<Watch> = [];
    private messages: StorageProvider = new MemoryProvider();

    public save(storage: StorageProvider) {
        this.messages = storage;
    }

    public fact(message: Object) {
        var watches = this.watches;
        this.messages.save(message, function () {
            for (var i = 0; i < watches.length; i++) {
                watches[i].resultAdded(message);
            }
        });
    }

    public watch(
        start: Object,
        templates: Array<(target: Proxy) => Object>,
        resultAdded: (result: Object) => void,
        resultRemoved: (result: Object) => void) {

        var joins = parse(templates);
        this.watches.push(new Watch(
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
