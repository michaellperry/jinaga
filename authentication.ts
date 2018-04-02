import { Profile } from './jinaga';
import { Query } from './query/query';
import { FactMessage } from './http/messages';
import { WebClient } from './http/web-client';
import { FactRecord, FactReference, Storage } from './storage';

export class Principal {
    
}

function parseFactMessage(factMessage: FactMessage) {
    return <FactRecord>factMessage;
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