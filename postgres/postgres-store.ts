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

type EdgeRecord = {
    predecessor_hash: string,
    predecessor_type: string,
    successor_hash: string,
    successor_type: string,
    role: string
};

function makeEdgeRecord(predecessor: FactReference, successor: FactRecord, role: string): EdgeRecord {
    return {
        predecessor_hash: predecessor.hash,
        predecessor_type: predecessor.type,
        successor_hash: successor.hash,
        successor_type: successor.type,
        role
    };
}

function makeEdgeRecords(fact: FactRecord): EdgeRecord[] {
    let records: EdgeRecord[] = [];
    for (const role in fact.predecessors) {
        const predecessor = fact.predecessors[role];
        if (Array.isArray(predecessor)) {
            records = records.concat(predecessor.map(p => makeEdgeRecord(p, fact, role)));
        }
        else {
            records.push(makeEdgeRecord(predecessor, fact, role));
        }
    }
    return records;
}

export class PostgresStore implements Storage {
    private connectionFactory: ConnectionFactory;

    constructor (postgresUri: string) {
        this.connectionFactory = new ConnectionFactory(postgresUri);
    }
    
    async save(facts: FactRecord[]): Promise<boolean> {
        if (facts.length > 0) {
            const edgeRecords = facts.map(f => makeEdgeRecords(f))
                .reduce((a,b) => a.concat(b));
            const edgeValues = edgeRecords.map((e, i) => '($' + (i*5 + 1) + ', $' + (i*5 + 2) + ', $' + (i*5 + 3) + ', $' + (i*5 + 4) + ', $' + (i*5 + 5) + ')');
            const parameters = edgeRecords.map((e) => [e.predecessor_hash, e.predecessor_type, e.successor_hash, e.successor_type, e.role])
                .reduce((a,b) => a.concat(b));
            console.log(parameters);
            await this.connectionFactory.withTransaction(async (connection) => {
                await connection.query('INSERT INTO public.edge' +
                    ' (predecessor_hash, predecessor_type, successor_hash, successor_type, role)' +
                    ' VALUES ' + edgeValues.join(', '), parameters);
            });
        }
        return true;
    }

    async find(start: FactReference, query: Query): Promise<FactRecord[]> {
        console.log(query.toDescriptiveString());
        const sqlQuery = sqlFromSteps(start, query.steps);
        console.log(sqlQuery.sql);
        console.log(sqlQuery.parameters);
        const { rows } = await this.connectionFactory.with(async (connection) => {
            return await connection.query(sqlQuery.sql, sqlQuery.parameters);
        });
        console.log(rows);
        return rows.map(r => loadRecord(r));
    }
}