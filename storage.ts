import { Query } from './query/query';

export type FactReference = {
    type: string;
    hash: string;
};

export type FactRecord = {
    type: string;
    hash: string;
    predecessors: { [role: string]: FactReference[] },
    fields: {};
};

export interface Storage {
    save(fact: FactRecord): Promise<boolean>;
    find(start: FactReference, query: Query): Promise<FactRecord[]>;
}