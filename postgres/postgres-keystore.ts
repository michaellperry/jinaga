import { FactRecord } from '../storage';
import { Keystore, UserIdentity } from '../keystore';

export class PostgresKeystore implements Keystore {
    constructor (postgresUri: string) {
        
    }
    getUserFact(userIdentity: UserIdentity): Promise<FactRecord>{
        throw new Error('Not implemented');
    }
}