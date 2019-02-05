import Keypair = require('keypair');
import { md, pki, util } from "node-forge";
import { PoolClient } from 'pg';
import { canonicalizeFact, computeHash } from '../fact/hash';
import { Keystore, UserIdentity } from '../keystore';
import { FactRecord, FactSignature, PredecessorCollection } from '../storage';
import { ConnectionFactory } from './connection';

export class PostgresKeystore implements Keystore {
    private connectionFactory: ConnectionFactory;

    constructor (postgresUri: string) {
        this.connectionFactory = new ConnectionFactory(postgresUri);
    }

    getUserFact(userIdentity: UserIdentity): Promise<FactRecord> {
        return this.getIdentityFact('Jinaga.User', userIdentity);
    }

    getDeviceFact(deviceIdentity: UserIdentity): Promise<FactRecord> {
        return this.getIdentityFact('Jinaga.Device', deviceIdentity);
    }

    async signFact(userIdentity: UserIdentity, fact: FactRecord): Promise<FactSignature> {
        return await this.connectionFactory.withTransaction(async connection => {
            const { publicKey: publicPem, privateKey: privatePem } = await this.getPrivateKey(connection, userIdentity);
            const privateKey = <pki.rsa.PrivateKey>pki.privateKeyFromPem(privatePem);
            const canonicalString = canonicalizeFact(fact.fields, fact.predecessors);
            const digest = md.sha512.create().update(canonicalString);
            const hash = util.encode64(digest.digest().getBytes());
            if (fact.hash !== hash) {
                throw new Error('Hash does not match.');
            }
            const signature = util.encode64(privateKey.sign(digest));
            const publicKey = <pki.rsa.PublicKey>pki.publicKeyFromPem(publicPem);
            const verified = publicKey.verify(digest.digest().getBytes(), util.decode64(signature));
            if (!verified) {
                throw new Error('The signature did not verify correctly.');
            }
            return {
                type: fact.type,
                hash: fact.hash,
                signature,
                publicKey: publicPem
            }
        });
    }

    private getIdentityFact(type: string, identity: UserIdentity): Promise<FactRecord> {
        if (!identity) {
            return null;
        }
        return this.connectionFactory.withTransaction(async connection => {
            const publicKey = await this.getPublicKey(connection, identity);
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

    private async getPrivateKey(connection: PoolClient, userIdentity: UserIdentity) {
        const { rows } = await connection.query('SELECT public_key, private_key FROM public.user WHERE provider = $1 AND user_id = $2',
            [userIdentity.provider, userIdentity.id]);
        if (rows.length > 1) {
            throw new Error('Duplicate entries found in the keystore');
        }
        else if (rows.length === 1) {
            const publicKey = <string>rows[0]["public_key"];
            const privateKey = rows[0]["private_key"];
            return { publicKey, privateKey };
        }
        else {
            throw new Error('No entry found in the keystore');
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