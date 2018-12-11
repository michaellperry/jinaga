import { AuthorizationRules } from './authorization/authorizationRules';
import { Feed } from './feed/feed';
import { Keystore, UserIdentity } from './keystore';
import { Query } from './query/query';
import { FactRecord, FactReference } from './storage';
import { filterAsync, mapAsync } from './util/fn';

export class Authorization {
    constructor(
        private feed: Feed,
        private keystore: Keystore,
        private authorizationRules: AuthorizationRules) {
        
    }

    getUserFact(userIdentity: UserIdentity) {
        return this.keystore.getUserFact(userIdentity);
    }

    query(userIdentity: UserIdentity, start: FactReference, query: Query) {
        return this.feed.query(start, query);
    }

    load(userIdentity: UserIdentity, references: FactReference[]) {
        return this.feed.load(references);
    }

    async save(userIdentity: UserIdentity, facts: FactRecord[]) {
        const authorizedFacts = await this.authorize(userIdentity, facts);
        return await this.feed.save(authorizedFacts);
    }

    private async authorize(userIdentity: UserIdentity, facts: FactRecord[]): Promise<FactRecord[]> {
        if (!this.authorizationRules) {
            return facts;
        }

        const userFact = await this.keystore.getUserFact(userIdentity);
        const authorizedFacts = await filterAsync(facts, async f =>
            await this.authorizationRules.isAuthorized(userFact, f, this.feed));

        return authorizedFacts;
    }

    private async visit(predecessors: Promise<AuthorizationResult>[], fact: FactRecord, userFact: FactRecord) {
        const predecessorResults = await mapAsync(predecessors, p => p);
        const verdict = await this.evaluate(predecessorResults, userFact, fact);
        return { fact, verdict };
    }

    // Sort facts topologically.
    // For each fact:
    //   If at least one predecessor is forbidden:
    //     This fact is forbidden.    (Pf)               => Forbidden
    //   Else if at least one predecessor is new:
    //     If this fact is authorized:
    //       This fact is new.        (!Pf Pn Fa)        => New
    //     Else:
    //       This fact is forbidden.  (!Pf Pn !Fa)       => Forbidden
    //   Else if this fact is not present:
    //     If this fact is authorized:
    //       This fact is new.        (!Pf !Pn !Fp Fa)   => New
    //     Else:
    //       This fact is forbidden.  (!Pf !Pn !Fp !Fa)  => Forbidden
    //   Else if fact is authorized:
    //     This fact is signed.       (!Pf !Pn Fp Fa)    => Signed
    //   Else:
    //     This fact is existing.     (!Pf !Pn Fp !Fa)   => Existing
    //
    // If any are forbidden, then request is forbidden.
    // Save all signed and new facts.
    private async evaluate(predecessors: AuthorizationResult[], userFact: FactRecord, fact: FactRecord) {
        if (predecessors.some(p => p.verdict === "Forbidden")) {
            return "Forbidden";
        }

        const isAuthorized = await this.isAuthorized(userFact, fact);
        if (predecessors.some(p => p.verdict === "New")) {
            return isAuthorized ? "New" : "Forbidden";
        }

        const isPresent = await this.feed.exists(fact);
        if (!isPresent) {
            return isAuthorized ? "New" : "Forbidden";
        }

        return isAuthorized ? "Existing" : "Signed";
    }

    private async isAuthorized(userFact: FactRecord, fact: FactRecord) {
        if (!this.authorizationRules) {
            return true;
        }

        return await this.authorizationRules.isAuthorized(userFact, fact, this.feed);
    }
}

type AuthorizationVerdict = "New" | "Signed" | "Existing" | "Forbidden";

type AuthorizationResult = {
    fact: FactRecord;
    verdict: AuthorizationVerdict
};