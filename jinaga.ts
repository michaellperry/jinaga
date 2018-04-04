import { Authentication } from './authentication';
import { BrowserStore } from './browser-store';
import { Cache } from './cache';
import { Feed } from './feed';
import { Fork } from './fork';
import { computeHash } from './hash';
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
import { FactRecord, FactReference, PredecessorCollection } from './storage';

export interface Profile {
    displayName: string;
}

function hydrate<T>(record: FactRecord) {
    const fact: any = record.fields;
    fact.type = record.type;
    return <T>fact;
}

function dehydrateFact<T>(fact: T): FactRecord {
    let type: string = null;
    let fields: { [key: string]: any } = {};
    for (let field in fact) {
        const value = fact[field];
        if (field === 'type' && typeof(value) === 'string') {
            type = value;
        }
        else {
            fields[field] = value;
        }
    }
    const predecessors: PredecessorCollection = {};
    const hash = computeHash(fields, predecessors);
    return { type, hash, predecessors, fields };
}

function dehydrateReference<T>(fact: T): FactReference {
    const factRecord = dehydrateFact(fact);
    return {
        type: factRecord.type,
        hash: factRecord.hash
    };
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
        const results = await this.authentication.find(dehydrateReference(start), parseQuery(templates));
        return results.map(record => hydrate<U>(record));
    }

    async login<U>(): Promise<{ userFact: U, profile: Profile }> {
        const { userFact, profile } = await this.authentication.login();
        return {
            userFact: hydrate<U>(userFact),
            profile
        };
    }

    fact<T>(prototype: T) : T {
        return prototype;
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