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
    
    async save(facts: FactRecord[]): Promise<boolean> {
        const result = await this.connectionFactory.with(async (connection) => {
            await this.initialize(connection);
            const promises = facts.map((fact) => {
                return connection.insertOne(fact);
            });
            await Promise.all(promises);
            return true;
        });
        return result;
    }

    async find(start: FactReference, query: Query): Promise<FactRecord[]> {
        // S.from F.type="ImprovingU.UserName" N(S.prior F.type="ImprovingU.UserName")
        const result = await this.connectionFactory.with(async (connection) => {
            await this.initialize(connection);
            return connection.aggregate([{
                "$match": {
                    "predecessors.from.hash": start.hash,
                    "predecessors.from.type": start.type,
                    "type": "ImprovingU.UserName"
                }
            }, {
                "$lookup": {
                    "from": "facts",
                    "let": {
                        "hash": "$hash",
                        "type": "$type"
                    },
                    "pipeline": [{
                        "$unwind": "$predecessors.prior"
                    }, {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    { "$eq": [ "$predecessors.prior.hash", "$$hash"] },
                                    { "$eq": [ "$predecessors.prior.type", "$$type"] },
                                    { "$eq": [ "$type", "ImprovingU.UserName"] }
                                ]
                            }
                        }
                    }, {
                        "$limit": 1
                    }],
                    "as": "successors"
                }
            }, {
                "$match": {
                    "successors.hash": { "$exists": false }
                }
            }]);
        });
        console.log(result);
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