import { Query } from './query/query';
import { FactMessage, QueryMessage, FactReferenceMessage } from './http/messages';
import { WebClient } from './http/web-client';
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

function deserializeReference(message: FactReferenceMessage) : FactReference {
    return {
        type: message.type,
        hash: message.hash
    };
}

function deserializePredecessors(predecessors: { [role: string]: FactReferenceMessage[] }) {
    let result: { [role: string]: FactReference[] } = {};
    for(const role in predecessors) {
        result[role] = predecessors[role].map(deserializeReference);
    }
    return result;
}

function deserializeFactReference(reference: FactReferenceMessage, factMessages: FactMessage[]) : FactRecord {
    const factMessage = factMessages
        .find(message => message.hash == reference.hash && message.type == reference.type);
    if (!factMessage)
        return null;

    return {
        type: reference.type,
        predecessors: deserializePredecessors(factMessage.predecessors),
        fields: factMessage.fields
    };
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

    async find(start: FactReference, query: Query) {
        const response = await this.client.query(serializeQuery(start, query));
        const facts = response.results
            .map(factReference => deserializeFactReference(factReference, response.facts));
        return facts;
    }
}