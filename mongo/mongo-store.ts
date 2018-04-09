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
    
    async save(fact: FactRecord): Promise<boolean> {
        const result = await this.connectionFactory.with(async (connection) => {
            try {
                await connection.insertOne(fact);
                return true;
            }
            catch (error) {
                if (error.code === 11000) {
                    // Duplicate key. The object was already saved.
                    return false;
                }
                else {
                    throw new Error(error.message);
                }
            }
        });
        return result;
    }

    async find(start: FactReference, query: Query): Promise<FactRecord[]> {
        return [];
    }
}