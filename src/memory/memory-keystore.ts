import Keypair = require('keypair');

import { computeHash } from '../fact/hash';
import { Keystore, UserIdentity } from "../keystore";
import { FactRecord, PredecessorCollection, FactSignature } from "../storage";

export class MemoryKeystore implements Keystore {
    private keyPairs: { [key: string]: { publicKey: string, privateKey: string }} = {};

    getUserFact(userIdentity: UserIdentity): Promise<FactRecord> {
        return Promise.resolve(this.getIdentityFact('Jinaga.User', userIdentity));
    }
    
    getDeviceFact(userIdentity: UserIdentity): Promise<FactRecord> {
        return Promise.resolve(this.getIdentityFact('Jinaga.Device', userIdentity));
    }

    signFact(userIdentity: UserIdentity, fact: FactRecord): Promise<FactSignature> {
        throw new Error("Method not implemented.");
    }

    private getIdentityFact(type: string, identity: UserIdentity): FactRecord {
        if (!identity) {
            return null;
        }
        const publicKey = this.getPublicKey(identity);
        const predecessors: PredecessorCollection = {};
        const fields = {
            publicKey: publicKey
        };
        const hash = computeHash(fields, predecessors);
        return { type, hash, predecessors, fields };
    }

    private getPublicKey(userIdentity: UserIdentity): string {
        const key = `${userIdentity.provider}:${userIdentity.id}`;
        const keyPair = this.keyPairs[key];
        if (keyPair) {
            return keyPair.publicKey;
        }
        else {
            return this.generateKeyPair(key);
        }
    }

    private generateKeyPair(key: string) {
        const pair = Keypair({ bits: 1024 });
        const privateKey = pair.private;
        const publicKey = pair.public;
        this.keyPairs[key] = { publicKey, privateKey };
        return publicKey;
    }
}