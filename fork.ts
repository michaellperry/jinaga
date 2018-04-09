import { QueryMessage, SaveMessage } from './http/messages';
import { WebClient } from './http/web-client';
import { Query } from './query/query';
import { FactRecord, FactReference, Storage } from './storage';

function serializeSave(fact: FactRecord) : SaveMessage {
    return {
        facts: [fact]
    };
}

function serializeQuery(start: FactReference, query: Query) : QueryMessage {
    return {
        start: start,
        query: query.toDescriptiveString()
    };
}

function findFact(reference: FactReference, facts: FactRecord[]) : FactRecord {
    return facts.find(message =>
        message.hash == reference.hash &&
        message.type == reference.type);
}

export class Fork implements Storage {
    constructor(
        storage: Storage,
        private client: WebClient
    ) {
        
    }

    async save(fact: FactRecord): Promise<boolean> {
        const response = await this.client.save(serializeSave(fact));
        return true;
    }

    async find(start: FactReference, query: Query) {
        const response = await this.client.query(serializeQuery(start, query));
        const facts = response.results.map(factReference =>
            findFact(factReference, response.facts));
        return facts;
    }
}