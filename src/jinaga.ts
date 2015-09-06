import Interface = require("./interface");
import Query = Interface.Query;
import StorageProvider = Interface.StorageProvider;
import NetworkProvider = Interface.NetworkProvider;
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
    private network: NetworkProvider = null;

    public save(storage: StorageProvider) {
        this.messages = storage;
        if (this.network)
            this.messages.sync(this.network);
    }

    public sync(network: NetworkProvider) {
        this.network = network;
        this.messages.sync(this.network);
        this.network.connect((message: Object) => {
            this.factReceived(message, false);
        });
    }

    public fact(message: Object) {
        this.factReceived(message, true);
    }

    private factReceived(message: Object, enqueue: Boolean) {
        this.messages.save(message, enqueue, function (error1: string, saved: Boolean) {
            if (!error1 && saved) {
                _.each(this.watches, function (watch: Watch) {
                    _.each(watch.inverses, function (inverse: Inverse) {
                        this.messages.executeQuery(message, inverse.affected, function (error2: string, affected: Array<Object>) {
                            if (!error2) {
                                var some: any = _.some;
                                if (some(affected, (obj: Object) => _.isEqual(obj, watch.start))) {
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

        if (this.network) {
            this.network.watch(start, query);
        }
    }
}

export = Jinaga;
