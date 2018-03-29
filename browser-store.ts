import { Fact, FactReference, Query } from './fact';
import { Storage } from './storage';

export class BrowserStore implements Storage {
    save(fact: Fact): Promise<boolean> {
        throw new Error('Not implemented');
    }

    find(start: FactReference, query: Query): Promise<Fact[]> {
        throw new Error('Not implemented');
    }
}