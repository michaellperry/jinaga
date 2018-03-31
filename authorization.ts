import { UserIdentity, Keystore } from './keystore';
import { Feed } from './feed';
import { FactRecord } from './storage';

export class Authorization {
    constructor(feed: Feed, private keystore: Keystore) {
        
    }

    getUserFact(userIdentity: UserIdentity) {
        return this.keystore.getUserFact(userIdentity);
    }
}