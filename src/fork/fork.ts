import { Feed, Handler, Observable, Subscription } from '../feed/feed';
import { WebClient } from '../http/web-client';
import { Query } from '../query/query';
import { FactRecord, FactReference, factReferenceEquals } from '../storage';
import { flatten } from '../util/fn';
import { serializeLoad, serializeQuery, serializeSave } from './serialize';
import { TopologicalSorter } from '../fact/sorter';

class ForkSubscription implements Subscription {
    constructor(
        private inner: Subscription,
        private loaded: Promise<void>
    ) {}

    async load(): Promise<void> {
        await this.inner.load();
        await this.loaded;
    }

    dispose(): void {
        return this.inner.dispose();
    }
}

class ForkObservable implements Observable {
    constructor(
        private inner: Observable,
        private loaded: Promise<void>
    ) {}

    subscribe(added: Handler, removed: Handler): Subscription {
        return new ForkSubscription(this.inner.subscribe(added, removed), this.loaded);
    }
}

export class Fork implements Feed {
    constructor(
        private storage: Feed,
        private client: WebClient
    ) {
        
    }

    async save(facts: FactRecord[]): Promise<FactRecord[]> {
        const response = await this.client.save(serializeSave(facts));
        const saved = await this.storage.save(facts);
        return saved;
    }

    async query(start: FactReference, query: Query) {
        if (query.isDeterministic()) {
            const results = await this.storage.query(start, query);
            return results;
        }
        else {
            const response = await this.client.query(serializeQuery(start, query));
            return response.results;
        }
    }

    async load(references: FactReference[]): Promise<FactRecord[]> {
        const known = await this.storage.load(references);
        const remaining = references.filter(reference => !known.some(factReferenceEquals(reference)));
        if (remaining.length === 0) {
            return known;
        }
        else {
            const records = await this.loadRecords(remaining);
            return records.concat(known);
        }
    }

    from(fact: FactReference, query: Query): Observable {
        const observable = this.storage.from(fact, query);
        const loaded = this.initiateQuery(fact, query);
        return new ForkObservable(observable, loaded);
    }

    private async initiateQuery(start: FactReference, query: Query) {
        const queryResponse = await this.client.query(serializeQuery(start, query));
        const paths = queryResponse.results;
        if (paths.length > 0) {
            const references = distinct(flatten(paths, p => p));
            await this.loadRecords(references);
        }
    }

    private async loadRecords(references: FactReference[]) {
        const sorter = new TopologicalSorter<FactRecord>();
        let records: FactRecord[] = [];
        for (let start = 0; start < references.length; start += 300) {
            const chunk = references.slice(start, start + 300);
            const response = await this.client.load(serializeLoad(chunk));
            const facts = sorter.sort(response.facts, (p, f) => f);
            await this.storage.save(facts);
            records = records.concat(facts);
        }
        return records;
    }
}

function distinct(references: FactReference[]) {
    const result: FactReference[] = [];
    references.forEach(reference => {
        if (!result.some(r => r.hash === reference.hash && r.type === reference.type)) {
            result.push(reference);
        }
    })
    return result;
}