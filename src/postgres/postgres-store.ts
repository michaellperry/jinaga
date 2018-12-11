import { Query } from '../query/query';
import { FactPath, FactRecord, FactReference, Storage } from '../storage';
import { flatten } from '../util/fn';
import { ConnectionFactory, Row } from './connection';
import { makeEdgeRecords } from './edge-record';
import { sqlFromSteps } from './sql';

function loadFactRecord(r: Row): FactRecord {
    return {
        type: r.type,
        hash: r.hash,
        predecessors: JSON.parse(r.predecessors),
        fields: JSON.parse(r.fields)
    };
}

function loadFactPath(pathLength: number, r: Row): FactPath {
    let path: FactPath = [];
    for (let i = 0; i < pathLength; i++) {
        path.push({
            type: r['type' + i],
            hash: r['hash' + i]
        });
    }
    return path;
}

export class PostgresStore implements Storage {
    private connectionFactory: ConnectionFactory;

    constructor (postgresUri: string) {
        this.connectionFactory = new ConnectionFactory(postgresUri);
    }
    
    async save(facts: FactRecord[]): Promise<FactRecord[]> {
        if (facts.length > 0) {
            const edgeRecords = flatten(facts, makeEdgeRecords);
            const factValues = facts.map((f, i) => '($' + (i*4 + 1) + ', $' + (i*4 + 2) + ', $' + (i*4 + 3) + ', $' + (i*4 + 4) + ')');
            const factParameters = flatten(facts, (f) => [f.hash, f.type, JSON.stringify(f.fields), JSON.stringify(f.predecessors)]);
            await this.connectionFactory.withTransaction(async (connection) => {
                if (edgeRecords.length > 0) {
                    const edgeValues = edgeRecords.map((e, i) => '($' + (i*5 + 1) + ', $' + (i*5 + 2) + ', $' + (i*5 + 3) + ', $' + (i*5 + 4) + ', $' + (i*5 + 5) + ')');
                    const edgeParameters = flatten(edgeRecords, (e) => [e.predecessor_hash, e.predecessor_type, e.successor_hash, e.successor_type, e.role]);
                    await connection.query('INSERT INTO public.edge' +
                        ' (predecessor_hash, predecessor_type, successor_hash, successor_type, role)' +
                        ' (SELECT predecessor_hash, predecessor_type, successor_hash, successor_type, role' +
                        '  FROM (VALUES ' + edgeValues.join(', ') + ') AS v(predecessor_hash, predecessor_type, successor_hash, successor_type, role)' +
                        '  WHERE NOT EXISTS (SELECT 1 FROM public.edge' +
                        '   WHERE edge.predecessor_hash = v.predecessor_hash AND edge.predecessor_type = v.predecessor_type AND edge.successor_hash = v.successor_hash AND edge.successor_type = v.successor_type AND edge.role = v.role))' +
                        ' ON CONFLICT DO NOTHING',
                        edgeParameters);
                }
                await connection.query('INSERT INTO public.fact' +
                    ' (hash, type, fields, predecessors)' +
                    ' (SELECT hash, type, to_jsonb(fields), to_jsonb(predecessors)' +
                    '  FROM (VALUES ' + factValues.join(', ') + ') AS v(hash, type, fields, predecessors)' +
                    '  WHERE NOT EXISTS (SELECT 1 FROM public.fact' +
                    '   WHERE fact.hash = v.hash AND fact.type = v.type))' +
                    ' ON CONFLICT DO NOTHING',
                    factParameters);
            });
        }
        return facts;
    }

    async query(start: FactReference, query: Query): Promise<FactPath[]> {
        const sqlQuery = sqlFromSteps(start, query.steps);
        const { rows } = await this.connectionFactory.with(async (connection) => {
            return await connection.query(sqlQuery.sql, sqlQuery.parameters);
        });
        return rows.map(row => loadFactPath(sqlQuery.pathLength, row));
    }

    async exists(fact: FactReference): Promise<boolean> {
        const sql = 'SELECT COUNT(1) AS count FROM public.fact WHERE type=$1 AND hash=$2';
        const parameters = [ fact.type, fact.hash ];
        const { rows } = await this.connectionFactory.with(async (connection) => {
            return await connection.query(sql, parameters);
        });
        return rows[0].count > 0;
    }

    async load(references: FactReference[]): Promise<FactRecord[]> {
        if (references.length === 0) {
            return [];
        }

        const tuples = references.map((r, i) => '($' + (i*2 + 1) + ', $' + (i*2 + 2) + ')');
        const parameters = flatten(references, (r) => [r.type, r.hash]);
        const sql =
            'WITH RECURSIVE a(ancestor_hash, ancestor_type, hash, type) AS (' +
            ' SELECT v.hash AS ancestor_hash, v.type AS ancestor_type, v.hash, v.type' +
            ' FROM (VALUES ' + tuples.join(', ') + ') AS v (type, hash)' +
            ' UNION ALL' +
            ' SELECT e.predecessor_hash AS ancestor_hash, e.predecessor_type AS ancestor_type, a.hash, a.type' +
            ' FROM a' +
            ' JOIN public.edge e ON e.successor_hash = a.ancestor_hash AND e.successor_type = a.ancestor_type)' +
            ' SELECT fact.type, fact.hash, fact.fields, fact.predecessors' +
            ' FROM (SELECT DISTINCT a.ancestor_hash, a.ancestor_type FROM a) AS d' +
            ' JOIN public.fact ON d.ancestor_type = fact.type AND d.ancestor_hash = fact.hash;';
        const { rows } = await this.connectionFactory.with(async (connection) => {
            return await connection.query(sql, parameters);
        })
        return rows.map(loadFactRecord);
    }
}