import { Authentication } from './authentication';
import { dehydrateFact, dehydrateReference, hydrate, hydrateFromTree } from './fact/hydrate';
import { FeedImpl } from './feed/feed-impl';
import { Fork } from './fork/fork';
import { WebClient } from './http/web-client';
import { MemoryStore } from './memory/memory-store';
import { Clause, ConditionalSpecification, InverseSpecification, parseQuery, Proxy } from './query/query-parser';
import { FactReference, FactPath } from './storage';
import { Watch } from './watch/watch';
import { WatchImpl } from './watch/watch-impl';

export interface Profile {
    displayName: string;
}

export class Jinaga {
    private authentication: Authentication;
    private store: MemoryStore;

    private errorHandlers: ((message: string) => void)[] = [];
    private loadingHandlers: ((loading: boolean) => void)[] = [];
    private progressHandlers: ((count: number) => void)[] = [];
    
    constructor(url: string) {
        const store = new MemoryStore();
        const feed = new FeedImpl(store);
        const webClient = new WebClient(url);
        const fork = new Fork(feed, webClient);
        this.authentication = new Authentication(fork, webClient);
        this.store = store;
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

    async query<T, U>(start: T, clause: Clause<T, U>): Promise<U[]> {
        const reference = dehydrateReference(start);
        const query = parseQuery(clause);
        const results = await this.authentication.query(reference, query);
        if (results.length === 0) {
            return [];
        }
        const references = results.map(r => r[r.length - 1]);
        
        const facts = await this.authentication.load(references);
        return hydrateFromTree(references, facts);
    }

    async login<U>(): Promise<{ userFact: U, profile: Profile }> {
        const { userFact, profile } = await this.authentication.login();
        return {
            userFact: hydrate<U>(userFact),
            profile
        };
    }

    watch<T, U, V>(start: T, clause: Clause<T, U>, resultAdded: (result: U) => V, resultRemoved: (model: V) => void): Watch<U, V> {
        const reference = dehydrateReference(start);
        const query = parseQuery(clause);
        const onResultAdded = async (path: FactPath, model: U) => {
            return resultAdded(model);
        };
        const watch = new WatchImpl<U, V>(reference, query, onResultAdded, resultRemoved, this.authentication);
        watch.begin();
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
            throw error;
        }
    }
    
    where<T, U>(specification: Object, clause: Clause<T, U>): T {
        return new ConditionalSpecification(specification, clause.templates, true) as any;
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

    debug(): string {
        return this.store.debug().join('\n');
    }
}