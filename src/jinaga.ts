import { Authentication } from './authentication/authentication';
import { dehydrateFact, dehydrateReference, hydrate, hydrateFromTree } from './fact/hydrate';
import { MemoryStore } from './memory/memory-store';
import { Query } from './query/query';
import { Condition, Preposition, Specification } from './query/query-parser';
import { FactPath, uniqueFactReferences } from './storage';
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
    
    constructor(authentication: Authentication, store: MemoryStore) {
        this.authentication = authentication;
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

    async login<U>(): Promise<{ userFact: U, profile: Profile }> {
        const { userFact, profile } = await this.authentication.login();
        return {
            userFact: hydrate<U>(userFact),
            profile
        };
    }
    
    async fact<T>(prototype: T) : Promise<T> {
        try {
            if (!('type' in prototype)) {
                throw new Error('Specify the type of the fact.');
            }

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

    async query<T, U>(start: T, preposition: Preposition<T, U>) : Promise<U[]> {
        const reference = dehydrateReference(start);
        const query = new Query(preposition.steps);
        const results = await this.authentication.query(reference, query);
        if (results.length === 0) {
            return [];
        }
        const references = results.map(r => r[r.length - 1]);
        const uniqueReferences = uniqueFactReferences(references);

        const facts = await this.authentication.load(uniqueReferences);
        return hydrateFromTree(uniqueReferences, facts);
    }

    watch<T, U, V>(
        start: T,
        preposition: Preposition<T, U>,
        resultAdded: (result: U) => V,
        resultRemoved: (model: V) => void) : Watch<U, V>;
    watch<T, U, V>(
        start: T,
        preposition: Preposition<T, U>,
        resultAdded: (result: U) => void) : Watch<U, V>;
    watch<T, U, V>(
        start: T,
        preposition: Preposition<T, U>,
        resultAdded: (fact: U) => (V | void),
        resultRemoved?: (model: V) => void
    ) : Watch<U, V> {
        const reference = dehydrateReference(start);
        const query = new Query(preposition.steps);
        const onResultAdded = (path: FactPath, fact: U, take: ((model: V) => void)) => {
            const model = resultAdded(fact);
            take(resultRemoved ? <V>model : null);
        };
        const watch = new WatchImpl<U, V>(reference, query, onResultAdded, resultRemoved, this.authentication);
        watch.begin();
        return watch;
    }

    static for<T, U>(specification: (target : T) => Specification<U>) : Preposition<T, U> {
        return Preposition.for(specification);
    }

    for<T, U>(specification: (target : T) => Specification<U>) : Preposition<T, U> {
        return Jinaga.for(specification);
    }

    static match<T>(template: T): Specification<T> {
        return new Specification<T>(template,[]);
    }

    match<T>(template: T): Specification<T> {
        return Jinaga.match(template);
    }

    static exists<T>(template: T): Condition<T> {
        return new Condition<T>(template, [], false);
    }

    exists<T>(template: T): Condition<T> {
        return Jinaga.exists(template);
    }

    static notExists<T>(template: T): Condition<T> {
        return new Condition<T>(template, [], true);
    }

    notExists<T>(template: T): Condition<T> {
        return Jinaga.notExists(template);
    }

    static not<T, U>(condition: (target: T) => Condition<U>) : (target: T) => Condition<U> {
        return target => {
            const original = condition(target);
            return new Condition<U>(original.template, original.conditions, !original.negative);
        };
    }

    not<T, U>(condition: (target: T) => Condition<U>) : (target: T) => Condition<U> {
        return Jinaga.not(condition);
    }

    graphviz(): string {
        return this.store.graphviz().join('\n');
    }

    inspect() {
        return this.store.inspect();
    }
}