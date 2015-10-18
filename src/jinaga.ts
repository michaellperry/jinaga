import Interface = require("./interface");
import Query = Interface.Query;
import StorageProvider = Interface.StorageProvider;
import NetworkProvider = Interface.NetworkProvider;
import Proxy = Interface.Proxy;
import Coordinator = Interface.Coordinator;
import parse = require("./queryParser");
import MemoryProvider = require("./memory");
import QueryInverter = require("./queryInverter");
import Inverse = QueryInverter.Inverse;
import Debug = require("debug");
import Collections = require("./collections");
import _isEqual = Collections._isEqual;
import _some = Collections._some;

var debug: (string) => void = Debug ? Debug("jinaga") : function() {};

class Watch {
    constructor(
        public start: Object,
        public joins: Query,
        public resultAdded: (message: Object) => void,
        public resultRemoved: (message: Object) => void,
        public inverses: Array<Inverse>) {
    }
}

class JinagaCoordinator implements Coordinator {
    private watches: Array<Watch> = [];
    private messages: StorageProvider = null;
    private network: NetworkProvider = null;

    save(storage: StorageProvider) {
        this.messages = storage;
        this.messages.init(this);
        if (this.network)
            this.messages.sendAllFacts();
    }

    sync(network: NetworkProvider) {
        this.network = network;
        this.network.init(this);
        this.messages.sendAllFacts();
    }

    fact(message: Object) {
        this.messages.save(message, null);
    }

    watch(
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
            results.map(resultAdded);
        }, this);

        if (this.network) {
            this.network.watch(start, query);
        }
    }

    onSaved(fact: Object, source: any) {
        if (source === null) {
            this.messages.push(fact);
        }
        this.watches.map(function (watch: Watch) {
            watch.inverses.map(function (inverse: Inverse) {
                this.messages.executeQuery(fact, inverse.affected, function (error2: string, affected: Array<Object>) {
                    if (!error2) {
                        
                        if (_some(affected, (obj: Object) => _isEqual(obj, watch.start))) {
                            if (inverse.added && watch.resultAdded) {
                                this.messages.executeQuery(fact, inverse.added, function (error3: string, added: Array<Object>) {
                                    if (!error3) {
                                        added.map(watch.resultAdded);
                                    }
                                });
                            }
                            if (inverse.removed && watch.resultRemoved) {
                                this.messages.executeQuery(fact, inverse.removed, function (error2: string, added: Array<Object>) {
                                    if (!error2) {
                                        added.map(watch.resultRemoved);
                                    }
                                });
                            }
                        }
                    }
                }, this);
            }, this);
        }, this);
    }

    onReceived(fact: Object, source: any) {
        this.messages.save(fact, source);
    }

    onError(err: string) {
        debug(err);
    }

    send(fact: Object, source: any) {
        if (this.network)
            this.network.fact(fact);
    }
}

class Jinaga {
    private coordinator: JinagaCoordinator;

    constructor() {
        this.coordinator = new JinagaCoordinator();
        this.coordinator.save(new MemoryProvider());
    }

    public save(storage: StorageProvider) {
        this.coordinator.save(storage);
    }
    public sync(network: NetworkProvider) {
        this.coordinator.sync(network);
    }
    public fact(message: Object) {
        this.coordinator.fact(message);
    }
    public watch(
        start: Object,
        templates: Array<(target: Proxy) => Object>,
        resultAdded: (result: Object) => void,
        resultRemoved: (result: Object) => void) {
        this.coordinator.watch(start, templates, resultAdded, resultRemoved);
    }

    public where(
        specification: Object,
        conditions: Array<(target: Proxy) => Object>
    ) {
        return new Interface.ConditionalSpecification(specification, conditions, true);
    }

    public not(condition: (target: Proxy) => Object): (target: Proxy) => Object;
    public not(specification: Object): Object;
    public not(conditionOrSpecification: any): any {
        if (typeof(conditionOrSpecification) === "function") {
            var condition = <(target: Proxy) => Object>conditionOrSpecification;
            return (t: Proxy) => new Interface.InverseSpecification(condition(t));
        }
        else {
            var specification = <Object>conditionOrSpecification;
            return new Interface.InverseSpecification(specification);
        }
    }
}

export = Jinaga;
