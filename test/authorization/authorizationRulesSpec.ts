import { expect } from "chai";
import { AuthorizationRules } from "../../src/authorization/authorizationRules";
import { UserIdentity } from "../../src/keystore";
import { FactRecord } from "../../src/storage";

describe('Authorization rules', () => {
    it('should reject all facts', () => {
        const authorizationRules = new AuthorizationRules();
        const userIdentity: UserIdentity = null;
        const facts: FactRecord[] = [];
        const authorized = authorizationRules.isAuthorized(userIdentity, facts);

        expect(authorized).to.be.false;
    });
});