import { delay } from '../util/fn';
import { Fork } from './fork';
import { Profile } from './jinaga';
import { Query } from './query';
import { FactRecord, FactReference, Storage } from './storage';
import { FactMessage, WebClient } from './web-client';

export class Principal {
    
}

function parse(factMessage: FactMessage): FactRecord {
    return <FactRecord>factMessage;
}

export class Authorization implements Storage {
    private principal: Principal;

    constructor(inner: Fork, private client: WebClient) {
    }

    async login(): Promise<{ userFact: FactRecord, profile: Profile }> {
        const response = await this.client.login();
        return {
            userFact: new FactRecord(),
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