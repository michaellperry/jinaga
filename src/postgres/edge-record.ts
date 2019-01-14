import { FactRecord, FactReference } from '../storage';

export type EdgeRecord = {
    predecessor_hash: string,
    predecessor_type: string,
    successor_hash: string,
    successor_type: string,
    role: string
};

function makeEdgeRecord(predecessor: FactReference, successor: FactRecord, role: string): EdgeRecord {
    if (!predecessor.hash || !predecessor.type || !successor.hash || !successor.type) {
        throw new Error('Attempting to save edge with null hash or type.');
    }
    return {
        predecessor_hash: predecessor.hash,
        predecessor_type: predecessor.type,
        successor_hash: successor.hash,
        successor_type: successor.type,
        role
    };
}

export function makeEdgeRecords(fact: FactRecord): EdgeRecord[] {
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