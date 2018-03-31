import { FactRecord } from './storage';
import { Authentication } from './authentication';
import { BrowserStore } from './browser-store';
import { Cache } from './cache';
import { Feed } from './feed';
import { Fork } from './fork';
import { WebClient } from './rest/web-client';
import { delay } from 'util/fn';

export interface TemplateList<T, U> {

}

export interface Proxy {
    has(name: string): Proxy;
}

export class Clause<T, U> {
    constructor(
        public templates: ((target: Proxy) => {})[]
    ) {
    }
}

export interface Profile {
    displayName: string;
}

function hydrate<T>(fact: FactRecord) {
    return <T>{};
}

export class Jinaga {
    private authorization: Authentication;

    private errorHandlers: ((message: string) => void)[] = [];
    private loadingHandlers: ((loading: boolean) => void)[] = [];
    private progressHandlers: ((count: number) => void)[] = [];
    
    constructor(url: string) {
        const store = new BrowserStore();
        const cache = new Cache(store);
        const feed = new Feed(cache);
        const webClient = new WebClient(url);
        const fork = new Fork(feed, webClient);
        this.authorization = new Authentication(fork, webClient);
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
        return await delay(500, []);
    }

    async login<U>(): Promise<{ userFact: U, profile: Profile }> {
        const { userFact, profile } = await this.authorization.login();
        return {
            userFact: hydrate<U>(userFact),
            profile
        };
    }

    fact<T>(prototype: T) : T {
        return prototype;
    }
    
    where<T, U>(specification: Object, templates: TemplateList<T, U>): T {
        throw new Error('Not implemented');
    }

    suchThat<T, U>(template: ((target: T) => U)): Clause<T, U> {
        return new Clause<T, U>([template as any]);
    }

    not<T, U>(condition: (target: T) => U): (target: T) => U;
    not<T>(specification: T): T;
    not<T, U>(conditionOrSpecification: ((target: T) => U) | T): ((target: T) => U) | T {
        throw new Error('Not implemented');
    }
}