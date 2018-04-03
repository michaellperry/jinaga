import { Profile } from './jinaga';
import { Query } from './query/query';
import { FactMessage, FactReferenceMessage } from './http/messages';
import { WebClient } from './http/web-client';
import { FactRecord, FactReference, Storage } from './storage';

export class Principal {
    
}

function parseFactReferenceMessage(factReferenceMessage: FactReferenceMessage) : FactReference {
    return {
        type: factReferenceMessage.type,
        hash: factReferenceMessage.hash
    };
}

function parsePredecessorMessages(predecessors: { [role: string]: FactReferenceMessage[] })
    : { [role: string]: FactReference[] } {
    let result: { [role: string]: FactReference[] } = {};
    for(const role in predecessors) {
        const referenceMessages = predecessors[role];
        result[role] = referenceMessages.map(parseFactReferenceMessage);
    }
    return result;
}

function parseFactMessage(factMessage: FactMessage): FactRecord {
    return {
        type: factMessage.type,
        predecessors: parsePredecessorMessages(factMessage.predecessors),
        fields: factMessage.fields
    };
}

export class Authentication implements Storage {
    private principal: Principal;

    constructor(private inner: Storage, private client: WebClient) {
    }

    async login(): Promise<{ userFact: FactRecord, profile: Profile }> {
        const response = await this.client.login();
        return {
            userFact: parseFactMessage(response.userFact),
            profile: response.profile
        };
    }

    save(fact: FactRecord): Promise<boolean> {
        throw new Error('Not implemented');
    }

    find(start: FactReference, query: Query) {
        return this.inner.find(start, query);
    }
}