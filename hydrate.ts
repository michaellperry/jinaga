import { computeHash } from './hash';
import { FactRecord, FactReference, PredecessorCollection } from './storage';

export function hydrate<T>(record: FactRecord) {
    const fact: any = record.fields;
    fact.type = record.type;
    return <T>fact;
}

export function dehydrateFact(fact: { [key: string]: any }): FactRecord {
    let type: string = null;
    let fields: { [key: string]: any } = {};
    let predecessors: PredecessorCollection = {};
    for (let field in fact) {
        const value = fact[field];
        if (field === 'type' && typeof(value) === 'string') {
            type = value;
        }
        else if (typeof(value) === 'object') {
            if (!predecessors.hasOwnProperty(field)) {
                predecessors[field] = [];
            }
            const list = predecessors[field];
            if (Array.isArray(value)) {
                value.forEach((element) => {
                    list.push(dehydrateReference(value));
                });
            }
            else {
                list.push(dehydrateReference(value));
            }
        }
        else {
            fields[field] = value;
        }
    }
    const hash = computeHash(fields, predecessors);
    return { type, hash, predecessors, fields };
}

export function dehydrateReference(fact: { [key: string]: any }): FactReference {
    const factRecord = dehydrateFact(fact);
    return {
        type: factRecord.type,
        hash: factRecord.hash
    };
}