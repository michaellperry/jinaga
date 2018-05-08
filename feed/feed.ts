import { Query } from '../query/query';
import { FactRecord, FactReference, Storage } from '../storage';

export interface Subscription {
    dispose(): void;
}

export interface Observable {
    subscribe(handler: (fact: FactReference) => void): Subscription;
}

export interface Feed extends Storage {
    save(facts: FactRecord[]): Promise<FactRecord[]>;
    query(start: FactReference, query: Query): Promise<FactReference[]>;
    load(references: FactReference[]): Promise<FactRecord[]>;
    from(fact: FactReference, query: Query): Observable;
}