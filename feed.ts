import { Storage } from './storage';
import { FactReference, Query, Fact } from './fact';

export class Observable {
    subscribe(handler: (fact: Fact) => void): Observable {
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

    save(fact: Fact): Promise<boolean> {
        throw new Error('Not implemented');
    }
    
    find(start: FactReference, query: Query): Promise<Fact[]> {
        throw new Error('Not implemented');
    }

    from(fact: FactReference, query: Query): Observable {
        throw new Error('Not implemented');
    }
}