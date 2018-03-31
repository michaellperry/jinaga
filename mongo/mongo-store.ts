import { Query } from '../query';
import { FactRecord, FactReference, Storage } from '../storage';
import { ConnectionFactory } from './connection';

export class MongoStore implements Storage {
    private connectionFactory: ConnectionFactory;

    constructor(
        url: string,
        dbName: string,
        poolMaxAge: number) {

        this.connectionFactory = new ConnectionFactory(url, dbName, 'facts', poolMaxAge);
    }
    
    save(fact: FactRecord): Promise<boolean> {
        throw new Error('Not implemented');
    }

    find(start: FactReference, query: Query): Promise<FactRecord[]> {
        throw new Error('Not implemented');
    }
}