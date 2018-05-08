import { Query } from './query/query';

export type FactReference = {
    type: string;
    hash: string;
};

export type PredecessorCollection = {
    [role: string]: FactReference[] | FactReference
};

export type FactRecord = {
    type: string;
    hash: string;
    predecessors: PredecessorCollection,
    fields: {};
};

export interface Storage {
    save(facts: FactRecord[]): Promise<FactRecord[]>;
    query(start: FactReference, query: Query): Promise<FactReference[]>;
    load(references: FactReference[]): Promise<FactRecord[]>;
}