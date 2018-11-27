import { expect } from "chai";
import { AuthorizationRules } from "../../src/authorization/authorizationRules";
import { UserIdentity } from "../../src/keystore";
import { FactRecord } from "../../src/storage";

function givenUserIdentity(): UserIdentity {
    return null;
}

function givenFactRecord(): FactRecord {
    return {
        type: 'Known',
        fields: {},
        hash: '',
        predecessors: {}
    };
}

function givenAuthorizationRules(builder: (a: AuthorizationRules) => AuthorizationRules =
        a => a): AuthorizationRules {
    return builder(new AuthorizationRules());
}

describe('Authorization rules', () => {
    it('should reject all facts by default', () => {
        const authorizationRules = givenAuthorizationRules();
        const userIdentity = givenUserIdentity();
        const fact = givenFactRecord();
        const authorized = authorizationRules.isAuthorized(userIdentity, fact);

        expect(authorized).to.be.false;
    });

    it('should accept known facts', () => {
        const authorizationRules = givenAuthorizationRules(a => a
            .type('Known'));
        const userIdentity = givenUserIdentity();
        const fact = givenFactRecord();
        const authorized = authorizationRules.isAuthorized(userIdentity, fact);

        expect(authorized).to.be.true;
    })
});