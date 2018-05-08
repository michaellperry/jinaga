import { Query } from '../query/query';
import { FactRecord, FactReference, Storage } from '../storage';
import { Feed, Observable } from './feed';

export class ObservableImpl implements Observable {
    subscribe(handler: (fact: FactReference) => void): Observable {
        throw new Error('Not implemented');
    }

    quiet(handler: () => void): Observable {
        throw new Error('Not implemented');
    }

    dispose(): void {
        throw new Error('Not implemented');
    }
}

export class FeedImpl implements Feed {
    constructor(private inner: Storage) {

    }

    save(facts: FactRecord[]): Promise<boolean> {
        return this.inner.save(facts);
    }
    
    query(start: FactReference, query: Query): Promise<FactReference[]> {
        return this.inner.query(start, query);
    }

    load(references: FactReference[]): Promise<FactRecord[]> {
        return this.inner.load(references);
    }

    from(fact: FactReference, query: Query): Observable {
        throw new Error('Not implemented');
    }
}