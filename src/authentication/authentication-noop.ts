import { Feed } from "../feed/feed";
import { LoginResponse } from "../http/messages";
import { Query } from "../query/query";
import { FactRecord, FactReference } from "../storage";
import { Authentication } from "./authentication";

export class AuthenticationNoOp implements Authentication {
    constructor(
        private inner: Feed
    ) { }

    login(): Promise<LoginResponse> {
        throw new Error('No logged in user.');
    }
    local(): Promise<FactRecord> {
        throw new Error('No persistent device.');
    }
    from(fact: FactReference, query: Query) {
        return this.inner.from(fact, query);
    }
    save(facts: FactRecord[]) {
        return this.inner.save(facts);
    }
    query(start: FactReference, query: Query) {
        return this.inner.query(start, query);
    }
    exists(fact: FactReference) {
        return this.inner.exists(fact);
    }
    load(references: FactReference[]) {
        return this.inner.load(references);
    }
}