import { JinagaCoordinator } from './coordinator/jinaga-coordinator';
import { SubscriptionProxy } from './coordinator/subscription-proxy';
import { WatchProxy } from './coordinator/watch-proxy';
import { FactChannel } from './distributor/factChannel';
import { Instrumentation } from './instrumentation';
import { MemoryProvider } from './memory/provider';
import { NetworkProvider } from './network/provider';
import { ConditionalSpecification, InverseSpecification, Proxy } from './query/parser';
import { StorageProvider } from './storage/provider';

class Jinaga {
    private coordinator: JinagaCoordinator;

    constructor() {
        this.coordinator = new JinagaCoordinator();
        this.coordinator.save(new MemoryProvider());
    }

    public onError(handler: (message: string) => void) {
        this.coordinator.addErrorHandler(handler);
    }
    public onLoading(handler: (loading: boolean) => void) {
        this.coordinator.addLoadingHandler(handler);
    }
    public onProgress(handler: (queueCount: number) => void) {
        this.coordinator.addProgressHandler(handler);
    }
    public instrument(instrumentation: Instrumentation) {
        this.coordinator.instrument(instrumentation);
    }
    public save(storage: StorageProvider) {
        this.coordinator.save(storage);
    }
    public sync(network: NetworkProvider) {
        this.coordinator.sync(network);
    }
    public fact(message: Object): Object {
        var fact = JSON.parse(JSON.stringify(message));
        this.coordinator.fact(fact);
        return fact;
    }
    public watch(
        start: Object,
        templates: Array<(target: Proxy) => Object>,
        resultAdded: (result: Object) => void,
        resultRemoved: (result: Object) => void = null) : WatchProxy {
        var watch = this.coordinator.watch(
            JSON.parse(JSON.stringify(start)),
            null,
            templates,
            (mapping: any, result: Object) => resultAdded(result),
            resultRemoved);
        return new WatchProxy(this.coordinator, watch);
    }
    subscribe(start: Object, templates: ((target: Proxy) => Object)[]) {
        var watch = this.coordinator.subscribe(JSON.parse(JSON.stringify(start)), templates);
        return new SubscriptionProxy(this.coordinator, watch);
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
    public preload(cachedFacts: Array<any>) {
        var source = {};
        var channel = new FactChannel(1,
            message => {},
            fact => { this.coordinator.onReceived(fact, null, source); });
        cachedFacts.forEach(cachedFact => {
            channel.messageReceived(cachedFact);
        });
    }

    public where(
        specification: Object,
        conditions: Array<(target: Proxy) => Object>
    ) {
        return new ConditionalSpecification(specification, conditions, true);
    }

    public not(condition: (target: Proxy) => Object): (target: Proxy) => Object;
    public not(specification: Object): Object;
    public not(conditionOrSpecification: any): any {
        if (typeof(conditionOrSpecification) === "function") {
            var condition = <(target: Proxy) => Object>conditionOrSpecification;
            return (t: Proxy) => new InverseSpecification(condition(t));
        }
        else {
            var specification = <Object>conditionOrSpecification;
            return new InverseSpecification(specification);
        }
    }
}

export = Jinaga;
