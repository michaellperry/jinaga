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

    async save(facts: FactRecord[]): Promise<boolean> {
        const saved = await this.inner.save(facts);
        return saved;
    }

    query(start: FactReference, query: Query) {
        return this.inner.query(start, query);
    }

    load(references: FactReference[]): Promise<FactRecord[]> {
        return this.inner.load(references);
    }
}