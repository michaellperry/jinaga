import connect, { Collection, MongoClient, MongoCallback } from 'mongodb';

import { delay } from '../../util/fn';

export type Document = { [key: string]: any };

export class Connection {
    constructor(private collection: Collection) {

    }

    find(query: {}) {
        return new Promise<Document[]>((resolve, reject) => {
            const results: Document[] = [];
            const cursor = this.collection.find(query);
            cursor.forEach((result) => {
                results.push(result);
            }, (error) => {
                cursor.close();
                if (error) {
                    reject(error.message);
                }
                else {
                    resolve(results);
                }
            });
        });
    }

    insertOne(document: Document) {
        return new Promise<void>((resolve, reject) => {
            this.collection.insertOne(document, (error) => {
                if (error) {
                    reject(error.message);
                }
                else {
                    resolve();
                }
            })
        });
    }
}

export class ConnectionFactory {
    private clientPool: { mongoClient: MongoClient }[] = [];

    constructor(
        private url: string,
        private dbName: string,
        private collectionName: string,
        private poolMaxAge: number) {

    }

    async with<T>(callback: (connection: Connection) => Promise<T>) {
        const mongoClient = await this.getClient();
        const db = mongoClient.db(this.dbName);
        const collection = db.collection(this.collectionName);
        const connection = new Connection(collection);
        const result = await callback(connection);
        this.returnClient(mongoClient);
        return result;
    }

    private async getClient() {
        if (this.clientPool.length > 0) {
            const entry = this.clientPool.pop();
            return entry.mongoClient;
        }
        else {
            return await this.createClient();
        }
    }

    private async returnClient(mongoClient: MongoClient) {
        const entry = { mongoClient };
        this.clientPool.push(entry);
        await delay(this.poolMaxAge, true);
        const index = this.clientPool.indexOf(entry);
        if (index >= 0) {
            this.clientPool.splice(index, 1);
            mongoClient.close();
        }
    }

    private createClient() {
        return new Promise<MongoClient>((resolve, reject) => {
            const mdb: (url: string, callback: MongoCallback<MongoClient>) => void = <any>connect;
            mdb(this.url, (err, db) => {
                if (err) {
                    reject(err.message);
                }
                else {
                    resolve(db);
                }
            });
        });
    }
}