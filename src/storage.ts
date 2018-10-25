import { Query } from './query/query';
import { findIndex } from './util/fn';

export type FactReference = {
    type: string;
    hash: string;
};

export type FactPath = FactReference[];

export type PredecessorCollection = {
    [role: string]: FactReference[] | FactReference
};

export type FactRecord = {
    type: string;
    hash: string;
    predecessors: PredecessorCollection,
    fields: {};
};

export type FactSignature = {
    type: string;
    hash: string;
    publicKey: string;
    signature: string;
}

export type FactEnvelope = {
    fact: FactRecord;
    signatures: FactSignature[];
}

export interface Storage {
    save(envelopes: FactEnvelope[]): Promise<FactEnvelope[]>;
    query(start: FactReference, query: Query): Promise<FactPath[]>;
    exists(fact: FactReference): Promise<boolean>;
    load(references: FactReference[]): Promise<FactRecord[]>;
}

export function factReferenceEquals(a: FactReference) {
    return (r: FactReference) => r.hash === a.hash && r.type === a.type;
}

export function uniqueFactReferences(references: FactReference[]): FactReference[] {
    return references.filter((value, index, array) => {
        return findIndex(array, factReferenceEquals(value)) === index;
    });
}

export function factSignatureEquals(a: FactSignature) {
    return (s: FactSignature) => s.hash === a.hash && s.type === a.type &&
        s.publicKey === a.publicKey && s.signature === a.signature;
}