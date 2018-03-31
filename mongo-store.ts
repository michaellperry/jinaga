import { Keystore, UserIdentity } from './keystore';
import { Query } from './query';
import { FactRecord, FactReference, Storage } from './storage';

export class MongoStore implements Storage, Keystore {
    save(fact: FactRecord): Promise<boolean> {
        throw new Error('Not implemented');
    }

    find(start: FactReference, query: Query): Promise<FactRecord[]> {
        throw new Error('Not implemented');
    }

    getUserFact(userIdentity: UserIdentity): Promise<FactRecord> {
        throw new Error('Not implemented');
    }
}