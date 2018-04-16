import { Feed } from './feed';
import { Keystore, UserIdentity } from './keystore';
import { Query } from './query/query';
import { FactReference, FactRecord } from './storage';

export class Authorization {
    constructor(private feed: Feed, private keystore: Keystore) {
        
    }

    getUserFact(userIdentity: UserIdentity) {
        return this.keystore.getUserFact(userIdentity);
    }

    query(userIdentity: UserIdentity, start: FactReference, query: Query) {
        return this.feed.find(start, query);
    }

    save(userIdentity: UserIdentity, facts: FactRecord[]) {
        return this.feed.save(facts);
    }
}