import { computeHash } from './hash';
import { FactRecord, FactReference, PredecessorCollection } from '../storage';

export type HashMap = { [key: string]: any };

type DehydrationEntry = {
    fact: HashMap,
    record: FactRecord,
    reference: FactReference
};

class Dehydration {
    private entries : DehydrationEntry[] = [];

    factRecords() {
        return this.entries.map(entry => entry.record);
    }

    dehydrate(fact: HashMap) {
        const entry = this.entries.find(entry => {
            return entry.fact === fact;
        });

        if (entry) {
            return entry.reference;
        }

        const record = this.createFactRecord(fact);
        const reference = {
            type: record.type,
            hash: record.hash
        };
        if (!this.entries.find(entry => {
            return entry.reference.hash === reference.hash &&
                entry.reference.type === reference.type;
        })) {
            this.entries.push({ fact, record, reference });
        }

        return reference;
    }

    private createFactRecord(fact: HashMap): FactRecord {
        let type: string = null;
        let fields: HashMap = {};
        let predecessors: PredecessorCollection = {};
        for (let field in fact) {
            const value = fact[field];
            if (field === 'type' && typeof(value) === 'string') {
                type = value;
            }
            else if (typeof(value) === 'object') {
                if (Array.isArray(value)) {
                    predecessors[field] = value.map(element => {
                        return this.dehydrate(value);
                    });
                }
                else {
                    predecessors[field] = this.dehydrate(value);
                }
            }
            else {
                fields[field] = value;
            }
        }
        const hash = computeHash(fields, predecessors);
        return { type, hash, predecessors, fields };
    }
}

export function hydrate<T>(record: FactRecord) {
    const fact: any = record.fields;
    fact.type = record.type;
    return <T>fact;
}

export function dehydrateFact(fact: HashMap): FactRecord[] {
    const dehydration = new Dehydration();
    dehydration.dehydrate(fact);
    return dehydration.factRecords();
}

export function dehydrateReference(fact: HashMap): FactReference {
    const dehydration = new Dehydration();
    return dehydration.dehydrate(fact);
}