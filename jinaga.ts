import { Authentication } from './authentication';
import { BrowserStore } from './browser-store';
import { Cache } from './cache';
import { dehydrateFact, dehydrateReference, hydrate, hydrateFromTree } from './fact/hydrate';
import { Feed } from './feed';
import { Fork } from './fork';
import { WebClient } from './http/web-client';
import {
    Clause,
    ConditionalSpecification,
    getTemplates,
    InverseSpecification,
    parseQuery,
    Proxy,
    TemplateList,
} from './query/query-parser';
import { Watch } from './watch/watch';
import { WatchImpl } from './watch/watch-impl';

export { Watch } from './watch/watch';

export interface Profile {
    displayName: string;
}

export class Jinaga {
    private authentication: Authentication;

    private errorHandlers: ((message: string) => void)[] = [];
    private loadingHandlers: ((loading: boolean) => void)[] = [];
    private progressHandlers: ((count: number) => void)[] = [];
    
    constructor(url: string) {
        const store = new BrowserStore();
        const cache = new Cache(store);
        const feed = new Feed(cache);
        const webClient = new WebClient(url);
        const fork = new Fork(feed, webClient);
        this.authentication = new Authentication(fork, webClient);
    }

    onError(handler: (message: string) => void) {
        this.errorHandlers.push(handler);
    }

    onLoading(handler: (loading: boolean) => void) {
        this.loadingHandlers.push(handler);
    }

    onProgress(handler: (queueCount: number) => void) {
        this.progressHandlers.push(handler);
    }

    async query<T, U>(start: T, templates: TemplateList<T, U>): Promise<U[]> {
        const reference = dehydrateReference(start);
        const query = parseQuery(templates);
        const results = await this.authentication.find(reference, query);
        if (results.length === 0) {
            return [];
        }
        
        const facts = await this.authentication.load(results);
        return hydrateFromTree(results, facts);
    }

    async login<U>(): Promise<{ userFact: U, profile: Profile }> {
        const { userFact, profile } = await this.authentication.login();
        return {
            userFact: hydrate<U>(userFact),
            profile
        };
    }

    watch<T, U, V>(start: T, templates: TemplateList<T, U>, resultAdded: (result: U) => V, resultRemoved: (model: V) => void): Watch {
        const reference = dehydrateReference(start);
        const query = parseQuery(templates);
        const watch = new WatchImpl<U, V>(reference, query, resultAdded, resultRemoved);
        this.authentication.find(reference, query)
            .then(async results => {
                if (results.length === 0) {
                    watch.onResults([]);
                }
                else {
                    const records = await this.authentication.load(results);
                    const facts = hydrateFromTree<U>(results, records);
                    watch.onResults(facts);
                }
            })
            .catch(reason => {
                watch.onError(reason);
            });
        return watch;
    }
    
    async fact<T>(prototype: T) : Promise<T> {
        try {
            const fact = JSON.parse(JSON.stringify(prototype));
            const factRecords = dehydrateFact(fact);
            const saved = await this.authentication.save(factRecords);
            return fact;
        } catch (error) {
            this.errorHandlers.forEach((errorHandler) => {
                errorHandler(error);
            });
        }
    }
    
    where<T, U>(specification: Object, templates: TemplateList<T, U>): T {
        return new ConditionalSpecification(specification, getTemplates(templates), true) as any;
    }

    suchThat<T, U>(template: ((target: T) => U)): Clause<T, U> {
        return new Clause<T, U>([template as any]);
    }

    not<T, U>(condition: (target: T) => U): (target: T) => U;
    not<T>(specification: T): T;
    not<T, U>(conditionOrSpecification: ((target: T) => U) | T): ((target: T) => U) | T {
        if (typeof(conditionOrSpecification) === "function") {
            const condition: (target: Proxy) => Object = conditionOrSpecification as any;
            return ((t: Proxy) => new InverseSpecification(condition(t))) as any;
        }
        else {
            const specification = <{}>conditionOrSpecification;
            return new InverseSpecification(specification) as any;
        }
    }
}