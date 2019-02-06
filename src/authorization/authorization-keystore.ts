import { verifyHash } from '../fact/hash';
import { TopologicalSorter } from '../fact/sorter';
import { Feed } from '../feed/feed';
import { Keystore, UserIdentity } from '../keystore';
import { Query } from '../query/query';
import { FactEnvelope, FactRecord, FactReference } from '../storage';
import { distinct, mapAsync } from '../util/fn';
import { Authorization } from "./authorization";
import { AuthorizationRules } from './authorizationRules';

export class Forbidden extends Error {
    __proto__: Error;
    constructor(message?: string) {
        const trueProto = new.target.prototype;
        super(message);

        this.__proto__ = trueProto;
    }
}

export class AuthorizationKeystore implements Authorization {
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
        if (!this.authorizationRules) {
            const envelopes = await this.feed.save(facts.map(fact => ({
                fact,
                signatures: []
            })));
            return envelopes.map(envelope => envelope.fact);
        }

        const userFact = await this.keystore.getUserFact(userIdentity);
        const sorter = new TopologicalSorter<Promise<AuthorizationResult>>();
        const results = await mapAsync(
            sorter.sort(facts, (p, f) => this.visit(p, f, userFact, facts)),
            x => x);

        const rejected = results.filter(r => r.verdict === "Forbidden");
        if (rejected.length > 0) {
            const distinctTypes = rejected
                .map(r => r.fact.type)
                .filter(distinct)
                .join(", ");
            const count = rejected.length === 1 ? "1 fact" : `${rejected.length} facts`;
            const message = `Rejected ${count} of type ${distinctTypes}.`;
            throw new Forbidden(message);
        }

        const authorizedFacts = results
            .filter(r => r.verdict === "New" || r.verdict === "Signed")
            .map(r => r.fact);
        const signedFacts = await mapAsync(authorizedFacts, async fact => (<FactEnvelope>{
            fact,
            signatures: await this.keystore.signFact(userIdentity, fact)
        }))
        const envelopes = await this.feed.save(signedFacts);
        return envelopes.map(envelope => envelope.fact);
    }

    private async visit(predecessors: Promise<AuthorizationResult>[], fact: FactRecord, userFact: FactRecord, factRecords: FactRecord[]): Promise<AuthorizationResult> {
        const predecessorResults = await mapAsync(predecessors, p => p);
        const verdict = await this.authorize(predecessorResults, userFact, fact, factRecords);
        return { fact, verdict };
    }

    private async authorize(predecessors: AuthorizationResult[], userFact: FactRecord, fact: FactRecord, factRecords: FactRecord[]) : Promise<AuthorizationVerdict> {
        if (predecessors.some(p => p.verdict === "Forbidden")) {
            return "Forbidden";
        }

        if (!verifyHash(fact)) {
            return "Forbidden";
        }

        const isAuthorized = await this.authorizationRules.isAuthorized(userFact, fact, factRecords, this.feed);
        if (predecessors.some(p => p.verdict === "New") || !(await this.feed.exists(fact))) {
            return isAuthorized ? "New" : "Forbidden";
        }

        return isAuthorized ? "Signed" : "Existing";
    }
}

type AuthorizationVerdict = "New" | "Signed" | "Existing" | "Forbidden";

type AuthorizationResult = {
    fact: FactRecord;
    verdict: AuthorizationVerdict
};