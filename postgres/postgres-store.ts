import { ConnectionFactory, Row } from './connection';
import { sqlFromSteps } from './sql';
import { Query } from '../query/query';
import { FactRecord, FactReference, Storage } from '../storage';

function loadRecord(r: Row): FactRecord {
    return {
        type: r.type,
        hash: r.hash,
        predecessors: r.predecessors,
        fields: r.fields
    };
}

export class PostgresStore implements Storage {
    private connectionFactory: ConnectionFactory;

    constructor (postgresUri: string) {
        this.connectionFactory = new ConnectionFactory(postgresUri);
    }
    
    save(facts: FactRecord[]): Promise<boolean> {
        throw new Error('Not implemented');
    }

    async find(start: FactReference, query: Query): Promise<FactRecord[]> {
        console.log(query.toDescriptiveString());
        const sqlQuery = sqlFromSteps(start, query.steps);
        console.log(sqlQuery.sql);
        const { rows } = await this.connectionFactory.with(async (connection) => {
            return await connection.query(sqlQuery.sql, sqlQuery.parameters);
        });
        console.log(rows);
        return rows.map(r => loadRecord(r));
    }
}