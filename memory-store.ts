import { Query } from './query/query';
import { FactRecord, FactReference, Storage } from './storage';

export class MemoryStore implements Storage {
    save(facts: FactRecord[]): Promise<boolean> {
        throw new Error('Not implemented');
    }

    query(start: FactReference, query: Query): Promise<FactRecord[]> {
        throw new Error('Not implemented');
    }

    load(references: FactReference[]): Promise<FactRecord[]> {
        throw new Error('Not implemented');
    }
}