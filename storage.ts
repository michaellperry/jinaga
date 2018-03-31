import { Query } from './query';

export class FactReference {

}

export interface FactRecord {
    type: string;
    fields: {};
}

export interface Storage {
    save(fact: FactRecord): Promise<boolean>;
    find(start: FactReference, query: Query): Promise<FactRecord[]>;
}