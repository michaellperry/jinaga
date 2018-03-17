import { JinagaCoordinator } from './coordinator/jinaga-coordinator';
import { SubscriptionProxy } from './coordinator/subscription-proxy';
import { WatchProxy } from './coordinator/watch-proxy';
import { FactChannel } from './distributor/factChannel';
import { Instrumentation } from './instrumentation';
import { MemoryProvider } from './memory/provider';
import { NetworkProvider } from './network/provider';
import { ConditionalSpecification, InverseSpecification, Proxy, Clause, TemplateList, getTemplates } from './query/parser';
import { StorageProvider } from './storage/provider';

class Jinaga {
    private coordinator: JinagaCoordinator;

    constructor() {
        this.coordinator = new JinagaCoordinator();
        this.coordinator.save(new MemoryProvider());
    }

    onError(handler: (message: string) => void) {
        this.coordinator.addErrorHandler(handler);
    }
    onLoading(handler: (loading: boolean) => void) {
        this.coordinator.addLoadingHandler(handler);
    }
    onProgress(handler: (queueCount: number) => void) {
        this.coordinator.addProgressHandler(handler);
    }
    instrument(instrumentation: Instrumentation) {
        this.coordinator.instrument(instrumentation);
    }
    save(storage: StorageProvider) {
        this.coordinator.save(storage);
    }
    sync(network: NetworkProvider) {
        this.coordinator.sync(network);
    }
    fact(message: Object): Object {
        var fact = JSON.parse(JSON.stringify(message));
        this.coordinator.fact(fact);
        return fact;
    }
    watch<T, U>(
        start: T,
        templates: TemplateList<T, U>,
        resultAdded: (result: Object) => void,
        resultRemoved: (result: Object) => void = null) : WatchProxy {
        var watch = this.coordinator.watch(
            JSON.parse(JSON.stringify(start)),
            null,
            getTemplates(templates),
            (mapping: any, result: Object) => resultAdded(result),
            resultRemoved);
        return new WatchProxy(this.coordinator, watch);
    }
    subscribe<T, U>(start: Object, templates: TemplateList<T, U>) {
        var watch = this.coordinator.subscribe(JSON.parse(JSON.stringify(start)), getTemplates(templates));
        return new SubscriptionProxy(this.coordinator, watch);
    }
    query<T, U>(
        start: Object,
        templates: TemplateList<T, U>,
        done: (result: Array<Object>) => void
    ) {
        this.coordinator.query(JSON.parse(JSON.stringify(start)), getTemplates(templates), done);
    }
    login(callback: (userFact: Object) => void) {
        this.coordinator.login(callback);
    }
    preload(cachedFacts: Array<any>) {
        var source = {};
        var channel = new FactChannel(1,
            message => {},
            fact => { this.coordinator.onReceived(fact, null, source); });
        cachedFacts.forEach(cachedFact => {
            channel.messageReceived(cachedFact);
        });
    }

    where<T, U>(specification: Object, templates: TemplateList<T, U>): T {
        return new ConditionalSpecification(specification, getTemplates(templates), true) as any;
    }

    exists<T, U>(template: ((target: T) => U)) : Clause<T, U> {
        return new Clause<T, U>([template as any]);
    }

    not<T, U>(condition: (target: T) => U): (target: T) => U;
    not<T>(specification: T): T;
    not<T, U>(arg: ((target: T) => U) | T): any {
        if (typeof(arg) === "function") {
            var condition: (target: Proxy) => Object = arg as any;
            return (t: Proxy) => new InverseSpecification(condition(t));
        }
        else {
            var specification = <Object>arg;
            return new InverseSpecification(specification);
        }
    }
}

export = Jinaga;
