import { Query } from './query/query';
import { FactRecord, FactReference, Storage } from './storage';
import { Trace } from './util/trace';

export class Cache implements Storage {
    private factsByReference: { [key: string]: FactRecord } = {};

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

    async load(references: FactReference[]) {
        const cacheLookup = references.map(reference => {
            const fact = this.factsByReference[referenceKey(reference)];
            if (fact) {
                return {
                    hit: true,
                    fact
                };
            }
            else {
                return {
                    hit: false,
                    reference
                }
            }
        });
        const hits = cacheLookup.filter(l => l.hit).map(l => l.fact);
        const misses = cacheLookup.filter(l => !l.hit).map(l => l.reference);
        if (misses.length > 0) {
            Trace.warn(`Load: ${JSON.stringify({misses}, null, 2)}`);
            const result = await this.inner.load(misses);
            result.forEach(result => {
                this.factsByReference[referenceKey(result)] = result;
            });
            return result.concat(hits);
        }
        else {
            return hits;
        }
    }
}

function referenceKey(reference: FactReference) {
    return `${reference.hash}:${reference.type}`;
}