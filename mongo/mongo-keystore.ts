import Keypair from 'keypair';

import { Keystore, UserIdentity } from '../keystore';
import { FactRecord } from '../storage';
import { Connection, ConnectionFactory, Document } from './connection';

export class MongoKeystore implements Keystore {
    private connectionFactory: ConnectionFactory;

    constructor(
        url: string,
        dbName: string) {

        this.connectionFactory = new ConnectionFactory(url, dbName, 'users');
    }
    
    getUserFact(userIdentity: UserIdentity): Promise<FactRecord> {
        return this.connectionFactory.with(async (connection) => {
            const userDocuments = await connection.find({
                provider: userIdentity.provider,
                userId: userIdentity.id
            });
            const publicKey = await this.getPublicKey(userDocuments, connection, userIdentity);
            return {
                type: 'Jinaga.User',
                hash: '',
                predecessors: {},
                fields: {
                    publicKey: publicKey
                }
            };
        });
    }

    private async getPublicKey(userDocuments: Document[], connection: Connection, userIdentity: UserIdentity) {
        if (userDocuments.length > 1) {
            throw new Error('Duplicate entries found in the keystore');
        }
        else if (userDocuments.length === 1) {
            return userDocuments[0].publicKey;
        }
        else {
            return this.generateKeyPair(connection, userIdentity);
        }
    }

    private async generateKeyPair(connection: Connection, userIdentity: UserIdentity) {
        const pair = Keypair({ bits: 1024 });
        const privateKey = pair.private;
        const publicKey = pair.public;
        await connection.insertOne({
            provider: userIdentity.provider,
            userId: userIdentity.id,
            privateKey: privateKey,
            publicKey: publicKey
        });
        return publicKey;
    }
}