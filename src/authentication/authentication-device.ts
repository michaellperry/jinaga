import { Feed, Observable } from '../feed/feed';
import { LoginResponse } from '../http/messages';
import { Keystore, UserIdentity } from '../keystore';
import { Query } from '../query/query';
import { FactRecord, FactReference } from '../storage';
import { Authentication } from './authentication';

export class AuthenticationDevice implements Authentication {
    constructor(
        private inner: Feed,
        private keystore: Keystore,
        private localDeviceIdentity: UserIdentity
    ) {}

    async login(): Promise<LoginResponse> {
        throw new Error('No logged in user.');
    }

    async local(): Promise<FactRecord> {
        return await this.keystore.getDeviceFact(this.localDeviceIdentity);
    }

    from(fact: FactReference, query: Query): Observable {
        return this.inner.from(fact, query);
    }

    save(facts: FactRecord[]): Promise<FactRecord[]> {
        return this.inner.save(facts);
    }

    query(start: FactReference, query: Query): Promise<FactReference[][]> {
        return this.inner.query(start, query);
    }

    exists(fact: FactReference): Promise<boolean> {
        throw new Error("Exists method not implemented on AuthenticationDevice.");
    }

    load(references: FactReference[]): Promise<FactRecord[]> {
        return this.inner.load(references);
    }
}