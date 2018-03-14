export interface UserIdentity {
    provider: string;
    id: string;
    profile: Object;
}

export interface KeystoreProvider {
    getUserFact(userIdentity: UserIdentity, done: (userFact: Object) => void);
}
