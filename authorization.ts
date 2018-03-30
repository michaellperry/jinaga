import { delay } from '../util/fn';
import { Fork } from './fork';
import { Profile } from './jinaga';
import { Query } from './query';
import { FactRecord, FactReference, Storage } from './storage';
import { FactMessage, WebClient } from './web-client';

export class Principal {
    
}

function parseFactMessage(factMessage: FactMessage) {
    return <FactRecord>factMessage;
}

export class Authorization implements Storage {
    private principal: Principal;

    constructor(inner: Fork, private client: WebClient) {
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

    find(start: FactReference, query: Query): Promise<FactRecord[]> {
        throw new Error('Not implemented');
    }
}