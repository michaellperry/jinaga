import { Query } from './query/query';
import { FactRecord, FactReference, Storage } from './storage';

export class Observable {
    subscribe(handler: (fact: FactRecord) => void): Observable {
        throw new Error('Not implemented');
    }

    quiet(handler: () => void): Observable {
        throw new Error('Not implemented');
    }

    dispose(): void {
        throw new Error('Not implemented');
    }
}

export class Feed implements Storage {
    constructor(private inner: Storage) {

    }

    save(facts: FactRecord[]): Promise<boolean> {
        return this.inner.save(facts);
    }
    
    find(start: FactReference, query: Query): Promise<FactReference[]> {
        return this.inner.find(start, query);
    }

    load(references: FactReference[]): Promise<FactRecord[]> {
        return this.inner.load(references);
    }

    from(fact: FactReference, query: Query): Observable {
        throw new Error('Not implemented');
    }
}