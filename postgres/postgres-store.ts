import { ConnectionFactory, Row } from './connection';
import { sqlFromSteps } from './sql';
import { Query } from '../query/query';
import { FactRecord, FactReference, Storage } from '../storage';

function loadFactRecord(r: Row): FactRecord {
    return {
        type: r.type,
        hash: r.hash,
        predecessors: JSON.parse(r.predecessors),
        fields: JSON.parse(r.fields)
    };
}

function loadFactReference(r: Row): FactReference {
    return {
        type: r.type,
        hash: r.hash
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
    
    async save(facts: FactRecord[]): Promise<FactRecord[]> {
        if (facts.length > 0) {
            const edgeRecords = flatmap(facts, makeEdgeRecords);
            const edgeValues = edgeRecords.map((e, i) => '($' + (i*5 + 1) + ', $' + (i*5 + 2) + ', $' + (i*5 + 3) + ', $' + (i*5 + 4) + ', $' + (i*5 + 5) + ')');
            const edgeParameters = flatmap(edgeRecords, (e) => [e.predecessor_hash, e.predecessor_type, e.successor_hash, e.successor_type, e.role]);
            const factValues = facts.map((f, i) => '($' + (i*4 + 1) + ', $' + (i*4 + 2) + ', $' + (i*4 + 3) + ', $' + (i*4 + 4) + ')');
            const factParameters = flatmap(facts, (f) => [f.hash, f.type, JSON.stringify(f.fields), JSON.stringify(f.predecessors)]);
            await this.connectionFactory.withTransaction(async (connection) => {
                await connection.query('INSERT INTO public.edge' +
                    ' (predecessor_hash, predecessor_type, successor_hash, successor_type, role)' +
                    ' (SELECT predecessor_hash, predecessor_type, successor_hash, successor_type, role' +
                    '  FROM (VALUES ' + edgeValues.join(', ') + ') AS v(predecessor_hash, predecessor_type, successor_hash, successor_type, role)' +
                    '  WHERE NOT EXISTS (SELECT 1 FROM public.edge' +
                    '   WHERE edge.predecessor_hash = v.predecessor_hash AND edge.predecessor_type = v.predecessor_type AND edge.successor_hash = v.successor_hash AND edge.successor_type = v.successor_type AND edge.role = v.role))',
                    edgeParameters);
                await connection.query('INSERT INTO public.fact' +
                    ' (hash, type, fields, predecessors)' +
                    ' (SELECT hash, type, to_jsonb(fields), to_jsonb(predecessors)' +
                    '  FROM (VALUES ' + factValues.join(', ') + ') AS v(hash, type, fields, predecessors)' +
                    '  WHERE NOT EXISTS (SELECT 1 FROM public.fact' +
                    '   WHERE fact.hash = v.hash AND fact.type = v.type))',
                    factParameters);
            });
        }
        return facts;
    }

    async query(start: FactReference, query: Query): Promise<FactReference[]> {
        const sqlQuery = sqlFromSteps(start, query.steps);
        const { rows } = await this.connectionFactory.with(async (connection) => {
            return await connection.query(sqlQuery.sql, sqlQuery.parameters);
        });
        return rows.map(loadFactReference);
    }

    async load(references: FactReference[]): Promise<FactRecord[]> {
        if (references.length === 0) {
            return [];
        }

        const tuples = references.map((r, i) => '($' + (i*2 + 1) + ', $' + (i*2 + 2) + ')');
        const parameters = flatmap(references, (r) => [r.type, r.hash]);
        const sql =
            'SELECT fact.type, fact.hash, fields, predecessors' +
            ' FROM (VALUES ' + tuples.join(', ') + ') AS v (type, hash)' +
            ' JOIN public.ancestor ON ancestor.type = v.type AND ancestor.hash = v.hash' +
            ' JOIN public.fact ON ancestor_type = fact.type AND ancestor_hash = fact.hash';
        const { rows } = await this.connectionFactory.with(async (connection) => {
            return await connection.query(sql, parameters);
        })
        return rows.map(loadFactRecord);
    }
}

function flatmap<T, U>(source: T[], projection: (t: T) => U[]) {
    if (source.length === 0) {
        return [];
    }

    return source.map(projection).reduce((a,b) => a.concat(b));
}