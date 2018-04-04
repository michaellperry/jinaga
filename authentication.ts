import { WebClient } from './http/web-client';
import { Query } from './query/query';
import { FactRecord, FactReference, Storage } from './storage';

export class Principal {
    
}

export class Authentication implements Storage {
    private principal: Principal;

    constructor(private inner: Storage, private client: WebClient) {
    }

    login() {
        return this.client.login();
    }

    save(fact: FactRecord): Promise<boolean> {
        throw new Error('Not implemented');
    }

    find(start: FactReference, query: Query) {
        return this.inner.find(start, query);
    }
}