import { Query } from './query/query';
import { FactRecord, FactReference, factReferenceEquals, Storage, uniqueFactRecords } from './storage';
import { flatten } from './util/fn';
import { Trace } from './util/trace';

export class Cache implements Storage {
    private factsByReference: { [key: string]: FactRecord[] } = {};

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
        const hits = flatten(cacheLookup.filter(l => l.hit), l => l.fact);
        const misses = cacheLookup.filter(l => !l.hit).map(l => l.reference);
        if (misses.length > 0) {
            Trace.warn(`Load: ${JSON.stringify({misses}, null, 2)}`);
            const results = await this.inner.load(misses);
            results.forEach(record => {
                const key = referenceKey(record);
                if (!this.factsByReference[key]) {
                    const closure = computeClosure(results, record);
                    this.factsByReference[key] = closure;
                }
            });
            return uniqueFactRecords(results.concat(hits));
        }
        else {
            return uniqueFactRecords(hits);
        }
    }
}

function referenceKey(reference: FactReference) {
    return `${reference.hash}:${reference.type}`;
}

function computeClosure(tree: FactRecord[], reference: FactReference) {
    let visited: { [key: string]: FactRecord } = {};
    addAncestors(tree, visited, reference);
    return Object.keys(visited).map(key => visited[key]);
}

function addAncestors(
    tree: FactRecord[],
    visited: { [key: string]: FactRecord },
    reference: FactReference) {
    const key = referenceKey(reference);
    if (!visited.hasOwnProperty(key)) {
        const record = tree.find(factReferenceEquals(reference));
        visited[key] = record;
        const predecessors = flatten(
            Object.keys(record.predecessors),
            p => predecessorArray(record.predecessors[p]));
        predecessors.forEach(predecessor => {
            addAncestors(tree, visited, predecessor);
        });
    }
}

function predecessorArray(predecessors: FactReference | FactReference[]) {
    return Array.isArray(predecessors) ? predecessors : [ predecessors ];
}