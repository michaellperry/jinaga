import { Query } from '../query/query';
import { FactRecord, FactReference, Storage } from '../storage';
import { Connection, ConnectionFactory } from './connection';

export class MongoStore implements Storage {
    private connectionFactory: ConnectionFactory;
    private initialized: boolean = false;

    constructor(
        url: string,
        dbName: string) {

        this.connectionFactory = new ConnectionFactory(url, dbName, 'facts');
    }
    
    async save(fact: FactRecord): Promise<boolean> {
        const result = await this.connectionFactory.with(async (connection) => {
            await this.initialize(connection);
            await connection.insertOne(fact);
            return true;
        });
        return result;
    }

    async find(start: FactReference, query: Query): Promise<FactRecord[]> {
        return [];
    }

    private async initialize(connection: Connection) {
        if (!this.initialized) {
            await connection.createIndex({
                type: 1,
                hash: 1
            }, {
                unique: true
            });
            this.initialized = true;
        }
    }
}