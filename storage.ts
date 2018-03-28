import { Fact, FactReference, Query } from './fact';

export interface Storage {
    save(fact: Fact): Promise<boolean>;
    find(start: FactReference, query: Query): Promise<Fact[]>;
}