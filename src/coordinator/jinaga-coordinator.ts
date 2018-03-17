import { Instrumentation } from '../instrumentation';
import { NetworkProvider } from '../network/provider';
import { completeInvertQuery, Inverse, invertQuery } from '../query/inverter';
import { parse, Proxy } from '../query/parser';
import { StorageProvider } from '../storage/provider';
import { _isEqual, _some } from '../utility/collections';
import { Coordinator } from './coordinator';
import { Watch } from './watch';
import { Subscription } from './subscription';

export class JinagaCoordinator implements Coordinator {
    private errorHandlers: Array<(message: string) => void> = [];
    private loadingHandlers: Array<(loading: boolean) => void> = [];
    private progressHandlers: Array<(count: number) => void> = [];
    private watches: Array<Watch> = [];
    private messages: StorageProvider = null;
    private network: NetworkProvider = null;
    private loggedIn: boolean = false;
    private userFact: Object = null;
    private profile: Object = null;
    private loginCallbacks: Array<(userFact: Object, profile: Object) => void> = [];
    private nextToken: number = 1;
    private queries: Array<{ token: number, callback: () => void }> = [];
    private watchCount: number = 0;
    private instrumentationAdapters: Instrumentation[] = [];

    instrument(instrumentation: Instrumentation) {
        this.instrumentationAdapters.push(instrumentation);
    }

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

    addErrorHandler(callback: (message: string) => void) {
        this.errorHandlers.push(callback);
    }

    addLoadingHandler(callback: (loading: boolean) => void) {
        this.loadingHandlers.push(callback);
    }

    addProgressHandler(callback: (count: number) => void) {
        this.progressHandlers.push(callback);
    }

    fact(message: Object) {
        this.messages.save(message, null);
    }

    watch(
        start: Object,
        outer: Watch,
        templates: Array<(target: Proxy) => Object>,
        resultAdded: (mapping: any, result: Object) => void,
        resultRemoved: (result: Object) => void) : Watch {

        var query = parse(templates);
        var full = outer === null ? query : outer.joins.concat(query);
        var inverses = invertQuery(full);
        var backtrack = outer === null ? null : completeInvertQuery(query);
        var watch = new Watch(
            start,
            full,
            resultAdded,
            resultRemoved,
            inverses,
            outer,
            backtrack);
        if (!outer) {
            this.watches.push(watch);
        }
        else {
            outer.addChild(watch);
        }
        this.watchesChanged();

        this.messages.executeQuery(start, full, this.userFact, (_, results) => {
            results.forEach((fact) => {
                if (outer) {
                    this.messages.executeQuery(fact, backtrack, this.userFact, (_, intermediates) => {
                        intermediates.forEach((intermediate) => {
                            var intermediateMapping = outer.get(intermediate);
                            if (intermediateMapping) {
                                this.output(
                                    intermediateMapping,
                                    fact,
                                    watch);
                            }
                        });
                    });
                }
                else {
                    this.output(null, fact, watch);
                }
            });
        });

        if (this.network) {
            let watchFinished = () => {
                this.watchCount--;
                if (this.watchCount === 0) {
                    this.onLoading(false);
                }
            };

            this.queries.push({ token: this.nextToken, callback: watchFinished });
            this.network.query(start, full, this.nextToken);
            this.nextToken++;
            this.watchCount++;
            if (this.watchCount === 1) {
                this.onLoading(true);
            }
        }
        return watch;
    }

    subscribe(start: Object, templates: ((target: Proxy) => Object)[]) {
        var query = parse(templates);
        var subscription = new Subscription(start, query);
        if (this.network) {
            this.network.watch(start, query, this.nextToken);
            this.nextToken++;
        }
        return subscription;
    };

    query(
        start: Object,
        templates: Array<(target: Proxy) => Object>,
        done: (results: Array<Object>) => void
    ) {
        var query = parse(templates);
        var executeQueryLocal = () => {
            this.messages.executeQuery(start, query, this.userFact, (_, results) => {
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
        if (watch.outer) {
            watch.outer.removeChild(watch);
        }
        else {
            var index = this.watches.indexOf(watch);
            if (index >= 0) {
                this.watches.splice(index, 1);
            }
        }
        this.watchesChanged();
    }

    stopSubscription(subscription: Subscription) {
        if (this.network) {
            this.network.stopWatch(subscription.start, subscription.joins);
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
        this.watches.forEach((root) => {
            root.depthFirst((watch) => {
                watch.inverses.forEach((inverse: Inverse) => {
                    this.messages.executeQuery(fact, inverse.affected, this.userFact, (_, affected) => {
                        if (_some(affected, (obj: Object) => _isEqual(obj, watch.start))) {
                            if (inverse.added && watch.resultAdded) {
                                this.messages.executeQuery(fact, inverse.added, this.userFact, (_, added) => {
                                    added.forEach((fact) => {
                                        if (watch.backtrack) {
                                            this.messages.executeQuery(fact, watch.backtrack, this.userFact, (_, intermediates) => {
                                                intermediates.forEach((intermediate) => {
                                                    var outerMapping = watch.outer.get(intermediate);
                                                    if (outerMapping) {
                                                        this.output(
                                                            outerMapping,
                                                            fact,
                                                            watch);
                                                    }
                                                });
                                            });
                                        }
                                        else {
                                            this.output(null, fact, watch);
                                        }
                                    });
                                });
                            }
                            if (inverse.removed && watch.resultRemoved) {
                                this.messages.executeQuery(fact, inverse.removed, this.userFact, (_, added) => {
                                    added.forEach((fact) => {
                                        var mapping = watch.pop(fact);
                                        if (mapping)
                                            watch.resultRemoved(mapping);
                                    });
                                });
                            }
                        }
                    });
                });
            });
        });
    }

    onReceived(fact: Object, userFact: Object, source: any) {
        this.messages.save(fact, source);
    }

    onDelivered(token:number, destination:any) {
        this.messages.dequeue(token, destination);
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

    onLoading(loading: boolean) {
        this.loadingHandlers.forEach(handler => handler(loading));
    }

    onProgress(queueCount:number) {
        this.progressHandlers.forEach(handler => handler(queueCount));
    }

    onError(err: string) {
        this.errorHandlers.forEach(h => h(err));
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

    resendMessages() {
        this.messages.sendAllFacts();
    }

    private output(
        parentMapping: any,
        fact: Object,
        watch: Watch
    ) {
        var mapping = watch.resultAdded(parentMapping, fact) || fact;
        watch.push(fact, mapping);
    }

    private watchesChanged() {
        this.instrumentationAdapters.forEach(a => {
            const count = this.watches.reduce((i, w) => {
                return i + w.countWatches();
            }, 0);
            a.setCounter('watches', count);
        });
    }
}
