import { Feed, Observable } from './feed/feed';
import { Keystore, UserIdentity } from './keystore';
import { Query } from './query/query';
import { FactRecord, FactReference } from './storage';

export class Authorization {
    constructor(private feed: Feed, private keystore: Keystore) {
        
    }

    getUserFact(userIdentity: UserIdentity) {
        return this.keystore.getUserFact(userIdentity);
    }

    query(userIdentity: UserIdentity, start: FactReference, query: Query) {
        return this.feed.query(start, query);
    }

    load(userIdentity: UserIdentity, references: FactReference[]) {
        return this.feed.load(references);
    }

    save(userIdentity: UserIdentity, facts: FactRecord[]) {
        return this.feed.save(facts);
    }
}