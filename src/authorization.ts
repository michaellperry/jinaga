import { AuthorizationRules } from './authorization/authorizationRules';
import { Feed } from './feed/feed';
import { Keystore, UserIdentity } from './keystore';
import { Query } from './query/query';
import { FactRecord, FactReference } from './storage';
import { filterAsync } from './util/fn';

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
}