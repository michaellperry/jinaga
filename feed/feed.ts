import { Query } from '../query/query';
import { FactPath, FactReference, Storage } from '../storage';

export interface Subscription {
    dispose(): void;
}

export type Handler = (facts: FactPath[]) => void;

export interface Observable {
    subscribe(added: Handler, removed: Handler): Subscription;
}

export interface Feed extends Storage {
    from(fact: FactReference, query: Query): Observable;
}