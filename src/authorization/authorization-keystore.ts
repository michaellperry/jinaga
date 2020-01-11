import { computeHash, verifyHash } from '../fact/hash';
import { TopologicalSorter } from '../fact/sorter';
import { Feed } from '../feed/feed';
import { Keystore, UserIdentity } from '../keystore';
import { Query } from '../query/query';
import { FactEnvelope, FactRecord, FactReference } from '../storage';
import { distinct, mapAsync } from '../util/fn';
import { Trace } from '../util/trace';
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
    private authorizationEngine: AuthorizationEngine | null;

    constructor(
        private feed: Feed,
        private keystore: Keystore,
        authorizationRules: AuthorizationRules | null) {

        this.authorizationEngine = authorizationRules &&
            new AuthorizationEngine(authorizationRules, feed);
    }

    async getUserFact(userIdentity: UserIdentity) {
        const userFact = await this.keystore.getUserFact(userIdentity);
        const envelopes = [
            <FactEnvelope>{
                fact: userFact,
                signatures: []
            }
        ];
        await this.feed.save(envelopes);
        return userFact;
    }

    query(userIdentity: UserIdentity, start: FactReference, query: Query) {
        return this.feed.query(start, query);
    }

    load(userIdentity: UserIdentity, references: FactReference[]) {
        return this.feed.load(references);
    }

    async save(userIdentity: UserIdentity, facts: FactRecord[]) {
        if (!this.authorizationEngine) {
            const envelopes = await this.feed.save(facts.map(fact => ({
                fact,
                signatures: []
            })));
            return envelopes.map(envelope => envelope.fact);
        }

        const userFact = await this.keystore.getUserFact(userIdentity);
        const authorizedFacts = await this.authorizationEngine.authorizeFacts(facts, userFact);
        const signedFacts = await mapAsync(authorizedFacts, async fact => (<FactEnvelope>{
            fact,
            signatures: await this.keystore.signFact(userIdentity, fact)
        }))
        const envelopes = await this.feed.save(signedFacts);
        return envelopes.map(envelope => envelope.fact);
    }
}

type AuthorizationVerdict = "New" | "Signed" | "Existing" | "Forbidden";

type AuthorizationResult = {
    fact: FactRecord;
    verdict: AuthorizationVerdict
};

class AuthorizationEngine {
    constructor(
        private authorizationRules: AuthorizationRules,
        private feed: Feed
    ) { }

    async authorizeFacts(facts: FactRecord[], userFact: FactRecord) {
        const sorter = new TopologicalSorter<Promise<AuthorizationResult>>();
        const results = await mapAsync(sorter.sort(facts, (p, f) => this.visit(p, f, userFact, facts)), x => x);
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
        return authorizedFacts;
    }


    private async visit(predecessors: Promise<AuthorizationResult>[], fact: FactRecord, userFact: FactRecord, factRecords: FactRecord[]): Promise<AuthorizationResult> {
        const predecessorResults = await mapAsync(predecessors, p => p);
        const verdict = await this.authorize(predecessorResults, userFact, fact, factRecords);
        return { fact, verdict };
    }

    private async authorize(predecessors: AuthorizationResult[], userFact: FactRecord, fact: FactRecord, factRecords: FactRecord[]) : Promise<AuthorizationVerdict> {
        if (predecessors.some(p => p.verdict === "Forbidden")) {
            const predecessor = predecessors
                .filter(p => p.verdict === 'Forbidden')
                .map(p => p.fact.type)
                .join(', ');
            Trace.warn(`The fact ${fact.type} cannot be authorized because its predecessor ${predecessor} is not authorized.`);
            return "Forbidden";
        }

        if (!verifyHash(fact)) {
            const computedHash = computeHash(fact.fields, fact.predecessors);
            Trace.warn(`The hash of ${fact.type} does not match: computed ${computedHash}, provided ${fact.hash}.`);
            return "Forbidden";
        }

        const isAuthorized = await this.authorizationRules.isAuthorized(userFact, fact, factRecords, this.feed);
        if (predecessors.some(p => p.verdict === "New") || !(await this.feed.exists(fact))) {
            if (!isAuthorized) {
                Trace.warn(`The fact of type ${fact.type} is not authorized.`);
            }
            return isAuthorized ? "New" : "Forbidden";
        }

        return isAuthorized ? "Signed" : "Existing";
    }
}
