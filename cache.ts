import { Query } from './query/query';
import { FactRecord, FactReference, Storage } from './storage';

export class Cache implements Storage {
    constructor(private inner: Storage) {

    }

    save(fact: FactRecord): Promise<boolean> {
        throw new Error('Not implemented');
    }

    find(start: FactReference, query: Query): Promise<FactRecord[]> {
        throw new Error('Not implemented');
    }
}FactReference