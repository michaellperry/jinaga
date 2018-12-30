import { Authorization } from "./authorization";
import { Feed } from "../feed/feed";
import { UserIdentity } from '../keystore';
import { Query } from '../query/query';
import { FactRecord, FactReference } from '../storage';
import { Forbidden } from "./authorization-keystore";

export class AuthorizationNoOp implements Authorization {
    constructor(
        private feed: Feed
    ) { }

    getUserFact(userIdentity: UserIdentity): Promise<FactRecord> {
        throw new Forbidden();
    }

    query(userIdentity: UserIdentity, start: FactReference, query: Query): Promise<any[]> {
        return this.feed.query(start, query);
    }

    load(userIdentity: UserIdentity, references: FactReference[]): Promise<FactRecord[]> {
        return this.feed.load(references);
    }

    save(userIdentity: UserIdentity, facts: FactRecord[]): Promise<FactRecord[]> {
        return this.feed.save(facts);
    }
}