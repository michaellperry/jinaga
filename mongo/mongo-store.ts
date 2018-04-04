import { Query } from '../query/query';
import { FactRecord, FactReference, Storage } from '../storage';
import { ConnectionFactory } from './connection';

export class MongoStore implements Storage {
    private connectionFactory: ConnectionFactory;

    constructor(
        url: string,
        dbName: string) {

        this.connectionFactory = new ConnectionFactory(url, dbName, 'facts');
    }
    
    save(fact: FactRecord): Promise<boolean> {
        throw new Error('Not implemented');
    }

    async find(start: FactReference, query: Query): Promise<FactRecord[]> {
        return [];
    }
}