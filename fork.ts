import { Query } from './query/query';
import { FactRecord, FactReference, Storage } from './storage';
import { WebClient } from './rest/web-client';

export class Fork implements Storage {
    constructor(
        storage: Storage,
        client: WebClient
    ) {
        
    }

    save(fact: FactRecord): Promise<boolean> {
        throw new Error('Not implemented');
    }

    find(start: FactReference, query: Query): Promise<FactRecord[]> {
        throw new Error('Not implemented');
    }
}