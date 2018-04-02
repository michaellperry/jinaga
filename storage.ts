import { Query } from './query/query';

export class FactReference {
    type: string;
    hash: number;
}

export interface FactRecord {
    type: string;
    fields: {};
}

export interface Storage {
    save(fact: FactRecord): Promise<boolean>;
    find(start: FactReference, query: Query): Promise<FactRecord[]>;
}