import { Query } from '../query/query';
import { FactRecord, FactReference, Storage } from '../storage';

export class PostgresStore implements Storage {
    constructor (postgresUri: string) {

    }
    
    save(facts: FactRecord[]): Promise<boolean> {
        throw new Error('Not implemented');
    }

    find(start: FactReference, query: Query): Promise<FactRecord[]> {
        throw new Error('Not implemented');
    }
}