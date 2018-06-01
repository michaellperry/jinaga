import Keypair = require('keypair');
import { PoolClient } from 'pg';

import { computeHash } from '../fact/hash';
import { Keystore, UserIdentity } from '../keystore';
import { FactRecord, PredecessorCollection } from '../storage';
import { ConnectionFactory } from './connection';


export class PostgresKeystore implements Keystore {
    private connectionFactory: ConnectionFactory;

    constructor (postgresUri: string) {
        this.connectionFactory = new ConnectionFactory(postgresUri);
    }

    getUserFact(userIdentity: UserIdentity): Promise<FactRecord> {
        return this.connectionFactory.withTransaction(async connection => {
            const publicKey = await this.getPublicKey(connection, userIdentity);
            const type = 'Jinaga.User';
            const predecessors: PredecessorCollection = {};
            const fields = {
                publicKey: publicKey
            };
            const hash = computeHash(fields, predecessors);
            return { type, hash, predecessors, fields };
        });
    }

    private async getPublicKey(connection: PoolClient, userIdentity: UserIdentity): Promise<string> {
        const { rows } = await connection.query('SELECT public_key FROM public.user WHERE provider = $1 AND user_id = $2',
            [userIdentity.provider, userIdentity.id]);
        if (rows.length > 1) {
            throw new Error('Duplicate entries found in the keystore');
        }
        else if (rows.length === 1) {
            return rows[0]["public_key"];
        }
        else {
            return this.generateKeyPair(connection, userIdentity);
        }
    }

    private async generateKeyPair(connection: PoolClient, userIdentity: UserIdentity) {
        const pair = Keypair({ bits: 1024 });
        const privateKey = pair.private;
        const publicKey = pair.public;
        await connection.query('INSERT INTO public.user (provider, user_id, private_key, public_key) VALUES ($1, $2, $3, $4)',
            [userIdentity.provider, userIdentity.id, privateKey, publicKey]);
        return publicKey;
    }
}