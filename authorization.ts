import { Profile } from './jinaga';
import { Fact, FactReference, Query, Principal } from './fact';
import { Fork } from './fork';
import { Storage } from './storage';
import { WebClient } from './web-client';

export class Authorization implements Storage {
    private principal: Principal;

    constructor(inner: Fork, client: WebClient) {
    }

    login(): Promise<{ userFact: Fact, profile: Profile }> {
        throw new Error('Not implemented');
    }

    save(fact: Fact): Promise<boolean> {
        throw new Error('Not implemented');
    }

    find(start: FactReference, query: Query): Promise<Fact[]> {
        throw new Error('Not implemented');
    }
}