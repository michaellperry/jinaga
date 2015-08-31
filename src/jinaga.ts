import Interface = require("./interface");
import Query = Interface.Query;
import StorageProvider = Interface.StorageProvider;
import Proxy = Interface.Proxy;
import parse = require("./queryParser");
import MemoryProvider = require("./memory");
import QueryInverter = require("./queryInverter");
import Inverse = QueryInverter.Inverse;
import _ = require("lodash");

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

    equals(that: Object) {
        return function (obj: Object) {
            var is: Boolean = _.isEqual(obj, that);
            return is;
        }
    }

    public fact(message: Object) {
        this.messages.save(message, function (error1) {
            if (!error1) {
                _.each(this.watches, function (watch: Watch) {
                    _.each(watch.inverses, function (inverse: Inverse) {
                        this.messages.executeQuery(message, inverse.affected, function (error2: string, affected: Array<Object>) {
                            if (!error2) {
                                var some: any = _.some;
                                if (some(affected, this.equals(watch.start))) {
                                    if (inverse.added && watch.resultAdded) {
                                        this.messages.executeQuery(message, inverse.added, function (error3: string, added: Array<Object>) {
                                            if (!error3) {
                                                _.each(added, watch.resultAdded);
                                            }
                                        });
                                    }
                                    if (inverse.removed && watch.resultRemoved) {
                                        this.messages.executeQuery(message, inverse.removed, function (error2: string, added: Array<Object>) {
                                            if (!error2) {
                                                _.each(added, watch.resultRemoved);
                                            }
                                        });
                                    }
                                }
                            }
                        }, this);
                    }, this);
                }, this);
            }
        }, this);
    }

    public watch(
        start: Object,
        templates: Array<(target: Proxy) => Object>,
        resultAdded: (result: Object) => void,
        resultRemoved: (result: Object) => void) {

        var query = parse(templates);
        var inverses = QueryInverter.invertQuery(query);
        if (inverses.length > 0) {
            this.watches.push(new Watch(
                start,
                query,
                resultAdded,
                resultRemoved,
                inverses));
        }

        this.messages.executeQuery(start, query, function(error, results) {
            _.each(results, resultAdded);
        }, this);
    }
}

export = Jinaga;
