import { Query } from '../query/query';
import { FactRecord, FactReference, Storage } from '../storage';

export interface Observable {
    subscribe(handler: (fact: FactReference) => void): Observable;
    quiet(handler: () => void): Observable;
    dispose(): void;
}

export interface Feed extends Storage {
    save(facts: FactRecord[]): Promise<boolean>;
    query(start: FactReference, query: Query): Promise<FactReference[]>;
    load(references: FactReference[]): Promise<FactRecord[]>;
    from(fact: FactReference, query: Query): Observable;
}