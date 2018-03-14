import { UserIdentity } from './user-identity';

export interface KeystoreProvider {
    getUserFact(userIdentity: UserIdentity, done: (userFact: Object) => void);
}
