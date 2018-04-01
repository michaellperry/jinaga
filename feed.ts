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

    save(fact: FactRecord): Promise<boolean> {
        throw new Error('Not implemented');
    }
    
    find(start: FactReference, query: Query): Promise<FactRecord[]> {
        throw new Error('Not implemented');
    }

    from(fact: FactReference, query: Query): Observable {
        throw new Error('Not implemented');
    }
}