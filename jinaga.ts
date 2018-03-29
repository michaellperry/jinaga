import { Fact } from './fact';
import { Fork } from './fork';
import { Authorization } from './authorization';
import { BrowserStore } from './browser-store';
import { Cache } from './cache';
import { Feed } from './feed';
import { WebClient } from './web-client';

export interface TemplateList<T, U> {

}

export interface Clause<T, U> {

}

export interface Profile {
    displayName: string;
}

function hydrate<T>(fact: Fact): T {
    throw new Error('Not implemented');
}

export class Jinaga {
    private authorization: Authorization;
    
    constructor(url: string) {
        const store = new BrowserStore();
        const cache = new Cache(store);
        const feed = new Feed(cache);
        const webClient = new WebClient();
        const fork = new Fork(feed, webClient);
        this.authorization = new Authorization(fork, webClient);
    }

    onError(handler: (message: string) => void): void {
        throw new Error('Not implemented');
    }

    onLoading(handler: (loading: boolean) => void): void {
        throw new Error('Not implemented');
    }

    onProgress(handler: (queueCount: number) => void): void {
        throw new Error('Not implemented');
    }

    query<T, U>(start: T, templates: TemplateList<T, U>, done: (result: U[]) => void): void {
        throw new Error('Not implemented');
    }

    login<U>(callback: (userFact: U, profile: Profile) => void): void {
        this.authorization.login()
            .then(({ userFact, profile }) => {
                callback(hydrate<U>(userFact), profile);
            });
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