export type FactReferenceMessage = {
    type: string,
    hash: string
};

export type FactMessage = {
    type: string,
    hash: string,
    roles: {
        role: string,
        predecessors: FactReferenceMessage[]
    },
    fields: {}
};

export type ProfileMessage = {
    displayName: string;
};

export type LoginResponse = {
    userFact: FactMessage,
    profile: ProfileMessage
};

export type QueryMessage = {
    start: FactReferenceMessage,
    query: string
};

export type QueryResponse = {
    facts: FactMessage[],
    results: FactReferenceMessage[]
};