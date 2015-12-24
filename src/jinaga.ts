import Interface = require("./interface");
import computeHash = Interface.computeHash;
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
    private mappings: { [hash: number]: Array<{ fact: Object, mapping: any }>; } = {};

    constructor(
        public start: Object,
        public joins: Query,
        public resultAdded: (fact: Object) => any,
        public resultRemoved: (mapping: any) => void,
        public inverses: Array<Inverse>) {
    }

    public push(fact: Object, mapping: any) {
        if (!mapping)
            return;
        var hash = computeHash(fact);
        var array = this.mappings[hash];
        if (!array) {
            array = [];
            this.mappings[hash] = array;
        }
        array.push({ fact, mapping });
    }

    public pop(fact: Object): any {
        var hash = computeHash(fact);
        var array = this.mappings[hash];
        if (!array)
            return null;
        for(var index = 0; index < array.length; index++) {
            if (_isEqual(array[index].fact, fact)) {
                var mapping = array[index].mapping;
                array.splice(index, 1);
                return mapping;
            }
        }
        return null;
    }
}

class JinagaCoordinator implements Coordinator {
    private watches: Array<Watch> = [];
    private messages: StorageProvider = null;
    private network: NetworkProvider = null;
    private loggedIn: boolean = false;
    private userFact: Object = null;
    private profile: Object = null;
    private loginCallbacks: Array<(userFact: Object, profile: Object) => void> = [];
    private nextToken: number = 1;
    private queries: Array<{ token: number, callback: () => void }> = [];

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
        resultRemoved: (result: Object) => void) : Watch {

        var watch: Watch = null;
        var query = parse(templates);
        var inverses = QueryInverter.invertQuery(query);
        if (inverses.length > 0) {
            watch = new Watch(
                start,
                query,
                resultAdded,
                resultRemoved,
                inverses);
            this.watches.push(watch);
        }

        this.messages.executeQuery(start, query, this.userFact, (error, results) => {
            results.forEach((fact) => {
                var mapping = resultAdded(fact);
                if (watch)
                    watch.push(fact, mapping);
            });
        });

        if (this.network) {
            this.network.watch(start, query);
        }
        return watch;
    }

    query(
        start: Object,
        templates: Array<(target: Proxy) => Object>,
        done: (results: Array<Object>) => void
    ) {
        var query = parse(templates);
        var executeQueryLocal = () => {
            this.messages.executeQuery(start, query, this.userFact, (error, results) => {
                done(results);
            });
        };
        if (this.network) {
            this.queries.push({ token: this.nextToken, callback: executeQueryLocal });
            this.network.query(start, query, this.nextToken);
            this.nextToken++;
        }
        else {
            executeQueryLocal();
        }
    }

    removeWatch(watch: Watch) {
        for (var index = 0; index < this.watches.length; ++index) {
            if (this.watches[index] === watch) {
                this.watches.splice(index, 1);
                return;
            }
        }
    }

    login(callback: (userFact: Object, profile: Object) => void) {
        if (this.loggedIn) {
            callback(this.userFact, this.profile);
        }
        else if (this.network) {
            this.loginCallbacks.push(callback);
        }
        else {
            callback(null, null);
        }
    }

    onSaved(fact: Object, source: any) {
        if (source === null) {
            this.messages.push(fact);
        }
        this.watches.map((watch: Watch) => {
            watch.inverses.map((inverse: Inverse) => {
                this.messages.executeQuery(fact, inverse.affected, this.userFact, (error2: string, affected: Array<Object>) => {
                    if (!error2) {
                        if (_some(affected, (obj: Object) => _isEqual(obj, watch.start))) {
                            if (inverse.added && watch.resultAdded) {
                                this.messages.executeQuery(fact, inverse.added, this.userFact, (error3: string, added: Array<Object>) => {
                                    if (!error3) {
                                        added.forEach((fact) => {
                                            var mapping = watch.resultAdded(fact) || fact;
                                            watch.push(fact, mapping);
                                        });
                                    }
                                });
                            }
                            if (inverse.removed && watch.resultRemoved) {
                                this.messages.executeQuery(fact, inverse.removed, this.userFact, (error2: string, added: Array<Object>) => {
                                    if (!error2) {
                                        added.forEach((fact) => {
                                            var mapping = watch.pop(fact);
                                            if (mapping)
                                                watch.resultRemoved(mapping);
                                        });
                                    }
                                });
                            }
                        }
                    }
                });
            });
        });
    }

    onReceived(fact: Object, userFact: Object, source: any) {
        this.messages.save(fact, source);
    }

    onDone(token: number) {
        var index: number = -1;
        for(var i = 0; i < this.queries.length; i++) {
            var query = this.queries[i];
            if (query.token === token) {
                index = i;
                break;
            }
        }
        if (index >= 0) {
            this.queries.splice(index, 1)[0].callback();
        }
    }

    onError(err: string) {
        debug(err);
    }

    send(fact: Object, source: any) {
        if (this.network)
            this.network.fact(fact);
    }

    onLoggedIn(userFact: Object, profile: Object) {
        this.userFact = userFact;
        this.profile = profile;
        this.loggedIn = true;
        this.loginCallbacks.forEach((callback: (userFact: Object, profile: Object) => void) => {
            callback(userFact, profile);
        });
        this.loginCallbacks = [];
    }
}

class WatchProxy {
    constructor(
        private coordinator: JinagaCoordinator,
        private watch: Watch
    ) { }

    public stop() {
        if (this.watch)
            this.coordinator.removeWatch(this.watch);
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
        this.coordinator.fact(JSON.parse(JSON.stringify(message)));
    }
    public watch(
        start: Object,
        templates: Array<(target: Proxy) => Object>,
        resultAdded: (result: Object) => void,
        resultRemoved: (result: Object) => void) : WatchProxy {
        var watch = this.coordinator.watch(JSON.parse(JSON.stringify(start)), templates, resultAdded, resultRemoved);
        return new WatchProxy(this.coordinator, watch);
    }
    public query(
        start: Object,
        templates: Array<(target: Proxy) => Object>,
        done: (result: Array<Object>) => void
    ) {
        this.coordinator.query(JSON.parse(JSON.stringify(start)), templates, done);
    }
    public login(callback: (userFact: Object) => void) {
        this.coordinator.login(callback);
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
