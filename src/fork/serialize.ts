import { LoadMessage, QueryMessage, SaveMessage } from '../http/messages';
import { Query } from '../query/query';
import { FactRecord, FactReference } from '../storage';

export function serializeSave(facts: FactRecord[]) : SaveMessage {
    return {
        facts: facts
    };
}

export function serializeQuery(start: FactReference, query: Query) : QueryMessage {
    return {
        start: start,
        query: query.toDescriptiveString()
    };
}

export function serializeLoad(references: FactReference[]) : LoadMessage {
    return {
        references: references
    };
}
