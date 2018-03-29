import { FactRecord } from './storage';
import { Authorization } from './authorization';
import { BrowserStore } from './browser-store';
import { Cache } from './cache';
import { Feed } from './feed';
import { Fork } from './fork';
import { WebClient } from './web-client';

export interface TemplateList<T, U> {

}

export interface Clause<T, U> {

}

export interface Profile {
    displayName: string;
}

function hydrate<T>(fact: FactRecord) {
    return <T>{};
}

export class Jinaga {
    private authorization: Authorization;

    private errorHandlers: ((message: string) => void)[] = [];
    private loadingHandlers: ((loading: boolean) => void)[] = [];
    private progressHandlers: ((count: number) => void)[] = [];
    
    constructor(url: string) {
        const store = new BrowserStore();
        const cache = new Cache(store);
        const feed = new Feed(cache);
        const webClient = new WebClient();
        const fork = new Fork(feed, webClient);
        this.authorization = new Authorization(fork, webClient);
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

    query<T, U>(start: T, templates: TemplateList<T, U>, done: (result: U[]) => void): void {
        throw new Error('Not implemented');
    }

    async login<U>(): Promise<{ userFact: U, profile: Profile }> {
        const { userFact, profile } = await this.authorization.login();
        return {
            userFact: hydrate<U>(userFact),
            profile
        };
    }

    fact<T>(prototype: T) : T {
        throw new Error('Not implemented');
    }
    
    where<T, U>(specification: Object, templates: TemplateList<T, U>): T {
        throw new Error('Not implemented');
    }

    suchThat<T, U>(template: ((target: T) => U)): Clause<T, U> {
        throw new Error('Not implemented');
    }

    not<T, U>(condition: (target: T) => U): (target: T) => U;
    not<T>(specification: T): T;
    not<T, U>(conditionOrSpecification: ((target: T) => U) | T): ((target: T) => U) | T {
        throw new Error('Not implemented');
    }
}