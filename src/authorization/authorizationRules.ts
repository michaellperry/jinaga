import { UserIdentity } from "../keystore";
import { FactRecord } from "../storage";

interface AuthorizationRule {
    isAuthorized(userIdentity: UserIdentity, fact: FactRecord): boolean;
}

class AuthorizationRuleAny implements AuthorizationRule {
    isAuthorized(userIdentity: UserIdentity, fact: FactRecord): boolean {
        return true;
    }
}

export class AuthorizationRules {
    private rulesByType: {[type: string]: AuthorizationRule[]} = {};

    type(type: string) {
        const oldRules = this.rulesByType[type] || [];
        const newRules = [ ...oldRules, new AuthorizationRuleAny() ];
        const newRulesByType = { ...this.rulesByType, [type]: newRules };
        const result = new AuthorizationRules();
        result.rulesByType = newRulesByType;
        return result;
    }

    isAuthorized(userIdentity: UserIdentity, fact: FactRecord): boolean {
        const rules = this.rulesByType[fact.type] || [];
        return rules.some(r => r.isAuthorized(userIdentity, fact));
    }
}