import { FactRecord, FactReference } from '../storage';

export type ProfileMessage = {
    displayName: string;
};

export type LoginResponse = {
    userFact: FactRecord,
    profile: ProfileMessage
};

export type QueryMessage = {
    start: FactReference,
    query: string
};

export type QueryResponse = {
    facts: FactRecord[],
    results: FactReference[]
};

export type SaveMessage = {
    facts: FactRecord[]
};

export type SaveResponse = {

};