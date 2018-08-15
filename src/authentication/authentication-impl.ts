import { Feed, Observable } from '../feed/feed';
import { WebClient } from '../http/web-client';
import { Query } from '../query/query';
import { FactRecord, FactReference } from '../storage';
import { Authentication } from './authentication';

export class Principal {
    
}

export class AuthenticationImpl implements Authentication {
    private principal: Principal;

    constructor(private inner: Feed, private client: WebClient) {
    }

    login() {
        return this.client.login();
    }

    async save(facts: FactRecord[]): Promise<FactRecord[]> {
        const saved = await this.inner.save(facts);
        return saved;
    }

    query(start: FactReference, query: Query) {
        return this.inner.query(start, query);
    }

    load(references: FactReference[]): Promise<FactRecord[]> {
        return this.inner.load(references);
    }

    from(fact: FactReference, query: Query): Observable {
        return this.inner.from(fact, query);
    }
}