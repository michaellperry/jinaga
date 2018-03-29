import { Query } from './query';
import { FactRecord, FactReference, Storage } from './storage';

export class MemoryStore implements Storage {
    save(fact: FactRecord): Promise<boolean> {
        throw new Error('Not implemented');
    }

    find(start: FactReference, query: Query): Promise<FactRecord[]> {
        throw new Error('Not implemented');
    }
}