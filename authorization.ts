import { Fact, FactReference, Principal, Query } from './fact';
import { Storage } from './storage';

export class Authorization implements Storage {
    constructor(private inner: Storage, private principal: Principal) {

    }

    save(fact: Fact): Promise<boolean> {
        throw new Error('Not implemented');
    }

    find(start: FactReference, query: Query): Promise<Fact[]> {
        throw new Error('Not implemented');
    }
}