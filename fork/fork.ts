import { Feed, Observable } from '../feed/feed';
import { LoadMessage, QueryMessage, SaveMessage } from '../http/messages';
import { WebClient } from '../http/web-client';
import { Query } from '../query/query';
import { FactRecord, FactReference, factReferenceEquals } from '../storage';
import { flatten, flattenAsync } from '../util/fn';
import { segmentQuery } from './segmenter';

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
        if (query.isDeterministic()) {
            const results = await this.storage.query(start, query);
            return results;
        }
        else {
            const response = await this.client.query(serializeQuery(start, query));
            return response.results;
        }
    }

    async load(references: FactReference[]): Promise<FactRecord[]> {
        const known = await this.storage.load(references);
        const remaining = references.filter(reference => !known.some(factReferenceEquals(reference)));
        if (remaining.length === 0) {
            return known;
        }
        else {
            const response = await this.client.load(serializeLoad(remaining));
            await this.storage.save(response.facts);
            return response.facts.concat(known);
        }
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
        const paths = await flattenAsync(segments, async segment => {
            const response = await this.client.query(serializeQuery(start, segment));
            return response.results;
        });
        const references = flatten(paths, p => p);
        const response = await this.client.load(serializeLoad(references));
        await this.storage.save(response.facts);
    }
}