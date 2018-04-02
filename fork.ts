import { Query } from './query/query';
import { FactMessage, QueryMessage } from './rest/messages';
import { WebClient } from './rest/web-client';
import { FactRecord, FactReference, Storage } from './storage';

function serializeQuery(start: FactReference, query: Query) : QueryMessage {
    return {
        start: start,
        query: query.toDescriptiveString()
    };
}

function deserializeFact(message: FactMessage) : FactRecord {
    throw new Error('Not implemented');
}

export class Fork implements Storage {
    constructor(
        storage: Storage,
        private client: WebClient
    ) {
        
    }

    save(fact: FactRecord): Promise<boolean> {
        throw new Error('Not implemented');
    }

    async find(start: FactReference, query: Query): Promise<FactRecord[]> {
        const response = await this.client.query(serializeQuery(start, query));
        const facts = response.results.map(message => deserializeFact(message));
        return facts;
    }
}