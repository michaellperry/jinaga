import { Feed, Observable } from './feed/feed';
import { LoadMessage, QueryMessage, SaveMessage } from './http/messages';
import { WebClient } from './http/web-client';
import { Query } from './query/query';
import { FactRecord, FactReference, Storage } from './storage';

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
        const response = await this.client.query(serializeQuery(start, query));
        return response.results;
    }

    async load(references: FactReference[]): Promise<FactRecord[]> {
        const response = await this.client.load(serializeLoad(references));
        await this.storage.save(response.facts);
        return response.facts;
    }

    from(fact: FactReference, query: Query): Observable {
        return this.storage.from(fact, query);
    }
}