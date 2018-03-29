import { delay } from '../util/fn';
import { Fork } from './fork';
import { Profile } from './jinaga';
import { Query } from './query';
import { FactRecord, FactReference, Storage } from './storage';
import { WebClient } from './web-client';

export class Principal {
    
}

export class Authorization implements Storage {
    private principal: Principal;

    constructor(inner: Fork, client: WebClient) {
    }

    async login(): Promise<{ userFact: FactRecord, profile: Profile }> {
        await delay(500, true);
        return {
            userFact: new FactRecord(),
            profile: {
                displayName: 'Fake User'
            }
        };
    }

    save(fact: FactRecord): Promise<boolean> {
        throw new Error('Not implemented');
    }

    find(start: FactReference, query: Query): Promise<FactRecord[]> {
        throw new Error('Not implemented');
    }
}