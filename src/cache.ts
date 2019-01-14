import { Query } from './query/query';
import { FactRecord, FactReference, Storage } from './storage';
import { Trace } from './util/trace';

export class Cache implements Storage {
    constructor(private inner: Storage) {

    }

    save(facts: FactRecord[]) {
        Trace.warn(`Save: ${JSON.stringify({facts}, null, 2)}`);
        return this.inner.save(facts);
    }

    query(start: FactReference, query: Query) {
        Trace.warn(`Query: ${JSON.stringify({start, query: query.toDescriptiveString()}, null, 2)}`);
        return this.inner.query(start, query);
    }

    exists(fact: FactReference): Promise<boolean> {
        Trace.warn(`Exists: ${JSON.stringify({fact}, null, 2)}`);
        return this.inner.exists(fact);
    }

    load(references: FactReference[]) {
        Trace.warn(`Load: ${JSON.stringify({references}, null, 2)}`);
        return this.inner.load(references);
    }
}