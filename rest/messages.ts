export type FactReferenceMessage = {

};

export type FactMessage = {

};

export type ProfileMessage = {
    displayName: string;
};

export type LoginResponse = {
    userFact: FactMessage,
    profile: ProfileMessage
};

export type QueryMessage = {
    start: {
        type: string,
        hash: number
    },
    query: string
};

export type QueryResponse = {
    results: FactMessage[]
};