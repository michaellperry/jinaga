import { Handler, Request } from 'express';

import { AuthenticationDevice } from './authentication/authentication-device';
import { AuthenticationSession } from './authentication/authentication-session';
import { Authorization } from './authorization';
import { Cache } from './cache';
import { Feed } from './feed/feed';
import { FeedImpl } from './feed/feed-impl';
import { HttpRouter, RequestUser } from './http/router';
import { Jinaga } from './jinaga';
import { Keystore, UserIdentity } from './keystore';
import { MemoryStore } from './memory/memory-store';
import { PostgresKeystore } from './postgres/postgres-keystore';
import { PostgresStore } from './postgres/postgres-store';
import { Storage } from './storage';
import { AuthorizationRules } from './authorization/authorizationRules';

export type JinagaServerConfig = {
    pgStore?: string,
    pgKeystore?: string,
    authorization?: (a: AuthorizationRules) => AuthorizationRules
};

export type JinagaServerInstance = {
    handler: Handler,
    j: Jinaga,
    withSession: (req: Request, callback: ((j: Jinaga) => Promise<void>)) => Promise<void>
};

const localDeviceIdentity = {
    provider: 'jinaga',
    id: 'local'
};

export class JinagaServer {
    static create(config: JinagaServerConfig): JinagaServerInstance {
        const store = createStore(config);
        const feed = new FeedImpl(store);
        const authorization = createAuthorization(config, feed);
        const router = new HttpRouter(authorization);
        const keystore = new PostgresKeystore(config.pgKeystore);
        const authentication = new AuthenticationDevice(feed, keystore, localDeviceIdentity);
        const memory = new MemoryStore();
        const j: Jinaga = new Jinaga(authentication, memory);
        return {
            handler: router.handler,
            j,
            withSession: (req, callback) => {
                return withSession(feed, keystore, req, callback);
            }
        }
    }
}

function createStore(config: JinagaServerConfig): Storage {
    if (config.pgStore) {
        const store = new PostgresStore(config.pgStore);
        const cache = new Cache(store);
        return cache;
    }
    else {
        return new MemoryStore();
    }
}

function createAuthorization(config: JinagaServerConfig, feed: Feed): Authorization {
    if (config.pgKeystore) {
        const keystore = new PostgresKeystore(config.pgKeystore);
        const authorizationRules = config.authorization ? config.authorization(new AuthorizationRules()) : null;
        const authorization = new Authorization(feed, keystore, authorizationRules);
        return authorization;
    }
    else {
        throw new Error('Cannot yet produce a non-authorized service');
    }
}

async function withSession(feed: Feed, keystore: Keystore, req: Request, callback: ((j: Jinaga) => Promise<void>)) {
    const user = <RequestUser>req.user;
    const userIdentity: UserIdentity = {
        provider: user.provider,
        id: user.id
    }
    const authentication = new AuthenticationSession(feed, keystore, userIdentity, user.profile.displayName, localDeviceIdentity);
    const j = new Jinaga(authentication, new MemoryStore());
    await callback(j);
}