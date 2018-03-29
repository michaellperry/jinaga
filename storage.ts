import { Query } from './query';

export class FactReference {

}

export class FactRecord {
    
}

export interface Storage {
    save(fact: FactRecord): Promise<boolean>;
    find(start: FactReference, query: Query): Promise<FactRecord[]>;
}