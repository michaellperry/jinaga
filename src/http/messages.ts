import { FactPath, FactRecord, FactReference } from '../storage';

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
    results: FactPath[]
};

export type SaveMessage = {
    facts: FactRecord[]
};

export type SaveResponse = {

};

export type LoadMessage = {
    references: FactReference[]
};

export type LoadResponse = {
    facts: FactRecord[]
};