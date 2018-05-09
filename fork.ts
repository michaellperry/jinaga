import { Feed, Observable } from './feed/feed';
import { LoadMessage, QueryMessage, SaveMessage } from './http/messages';
import { WebClient } from './http/web-client';
import { Query } from './query/query';
import { FactRecord, FactReference } from './storage';
import { flattenAsync } from './util/fn';

function serializeSave(facts: FactRecord[]) : SaveMessage {
    return {
        facts: facts
    };
}

function serializeQuery(start: FactReference, query: Query) : QueryMessage {
    return {
        start: start,
        query: query.toDescriptiveString()
    };
}

function serializeLoad(references: FactReference[]) : LoadMessage {
    return {
        references: references
    };
}

function segmentQuery(query: Query): Query[] {
    return [query];
}

export class Fork implements Feed {
    constructor(
        private storage: Feed,
        private client: WebClient
    ) {
        
    }

    async save(facts: FactRecord[]): Promise<FactRecord[]> {
        const response = await this.client.save(serializeSave(facts));
        const saved = await this.storage.save(facts);
        return saved;
    }

    async query(start: FactReference, query: Query) {
        const response = await this.client.query(serializeQuery(start, query));
        return response.results;
    }

    async load(references: FactReference[]): Promise<FactRecord[]> {
        const response = await this.client.load(serializeLoad(references));
        await this.storage.save(response.facts);
        return response.facts;
    }

    from(fact: FactReference, query: Query): Observable {
        const observable = this.storage.from(fact, query);
        this.initiateQuery(fact, query)
            .catch(reason => {
                // TODO: What do I do with this error?
                throw new Error(reason);
                // observable.notifyError(reason);
            });
        return observable;
    }

    private async initiateQuery(start: FactReference, query: Query) {
        const segments = segmentQuery(query);
        const references = await flattenAsync(segments, async segment => {
            const response = await this.client.query(serializeQuery(start, segment));
            return response.results;
        });
        const response = await this.client.load(serializeLoad(references));
        await this.storage.save(response.facts);
    }
}