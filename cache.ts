import { Query } from './query/query';
import { FactRecord, FactReference, Storage } from './storage';

export class Cache implements Storage {
    constructor(private inner: Storage) {

    }

    save(facts: FactRecord[]): Promise<boolean> {
        return this.inner.save(facts);
    }

    find(start: FactReference, query: Query): Promise<FactRecord[]> {
        return this.inner.find(start, query);
    }
}