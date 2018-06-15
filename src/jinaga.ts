import { Authentication } from './authentication';
import { dehydrateFact, dehydrateReference, hydrate, hydrateFromTree } from './fact/hydrate';
import { MemoryStore } from './memory/memory-store';
import {
    Clause,
    Condition,
    ConditionalSpecification,
    InverseSpecification,
    parseQuery,
    parseQuery1,
    Preposition,
    Proxy,
    Specification,
} from './query/query-parser';
import { FactPath } from './storage';
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

    query<T, U>(start: T, preposition: Preposition<T, U>) : Promise<U[]> {
        throw new Error('Not yet implemented');
    }

    watch<T, U, V>(start: T, preposition: Preposition<T, U>,
        resultAdded: (fact: U) => V, resultRemoved: (model: V) => void) : Watch<U, V> {
        throw new Error('Not yet implemented');
    }

    for<T, U>(specification: (target : T) => Specification<U>) : Preposition<T, U> {
        return Preposition.for(specification);
    }

    async query1<T, U>(start: T, clause: Clause<T, U>): Promise<U[]> {
        const reference = dehydrateReference(start);
        const query = parseQuery1(clause);
        const results = await this.authentication.query(reference, query);
        if (results.length === 0) {
            return [];
        }
        const references = results.map(r => r[r.length - 1]);
        
        const facts = await this.authentication.load(references);
        return hydrateFromTree(references, facts);
    }

    watch1<T, U, V>(start: T, clause: Clause<T, U>, resultAdded: (fact: U) => V, resultRemoved: (model: V) => void): Watch<U, V> {
        const reference = dehydrateReference(start);
        const query = parseQuery1(clause);
        const onResultAdded = (path: FactPath, fact: U, take: ((model: V) => void)) => {
            const model = resultAdded(fact);
            take(model);
        };
        const watch = new WatchImpl<U, V>(reference, query, onResultAdded, resultRemoved, this.authentication);
        watch.begin();
        return watch;
    }

    match<T>(template: T): Specification<T> {
        return new Specification<T>(template,[]);
    }

    exists<T>(template: T): Condition<T> {
        return new Condition<T>(template, [], false);
    }

    notExists<T>(template: T): Condition<T> {
        return new Condition<T>(template, [], true);
    }

    not<T, U>(condition: (target: T) => Condition<U>) : (target: T) => Condition<U> {
        return target => {
            const original = condition(target);
            return new Condition<U>(original.template, original.conditions, !original.negative);
        };
    }
    
    where1<T, U>(specification: Object, clause: Clause<T, U>): T {
        return new ConditionalSpecification(specification, clause.templates, true) as any;
    }

    suchThat1<T, U>(template: ((target: T) => U)): Clause<T, U> {
        return new Clause<T, U>([template as any]);
    }

    not1<T, U>(condition: (target: T) => U): (target: T) => U;
    not1<T>(specification: T): T;
    not1<T, U>(conditionOrSpecification: ((target: T) => U) | T): ((target: T) => U) | T {
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