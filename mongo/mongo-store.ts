import { Query } from '../query/query';
import { FactRecord, FactReference, Storage } from '../storage';
import { Connection, ConnectionFactory, Document } from './connection';
import { pipelineFromSteps } from './pipeline';

function loadRecord(r: Document): FactRecord {
    return {
        type: r.type,
        hash: r.hash,
        predecessors: r.predecessors,
        fields: r.fields
    };
}

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
        console.log(query.toDescriptiveString());
        const pipeline = pipelineFromSteps(start, query.steps);
        console.log(pipeline);
        const results = await this.connectionFactory.with(async (connection) => {
            await this.initialize(connection);
            return connection.aggregate(pipeline);
        });
        console.log(results);
        return results.map(r => loadRecord(r));
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