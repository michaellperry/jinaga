import { Query } from './query/query';
import { FactRecord, FactReference, Storage } from './storage';

export class Cache implements Storage {
    constructor(private inner: Storage) {

    }

    save(facts: FactRecord[]) {
        return this.inner.save(facts);
    }

    query(start: FactReference, query: Query) {
        return this.inner.query(start, query);
    }

    load(references: FactReference[]) {
        return this.inner.load(references);
    }
}