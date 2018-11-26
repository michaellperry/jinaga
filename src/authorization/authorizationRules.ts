import { UserIdentity } from "../keystore";
import { FactRecord } from "../storage";

export class AuthorizationRules {
    isAuthorized(userIdentity: UserIdentity, facts: FactRecord[]): boolean {
        return false;
    }
}