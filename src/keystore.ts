import { FactRecord } from "./storage";

export interface UserIdentity {
    provider: string;
    id: string;
}

export interface Keystore {
    getUserFact(userIdentity: UserIdentity): Promise<FactRecord>;
}