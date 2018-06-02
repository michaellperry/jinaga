import { Authorization } from './authorization';
import { Cache } from './cache';
import { Feed } from './feed/feed';
import { FeedImpl } from './feed/feed-impl';
import { Handler } from 'express';
import { HttpRouter } from './http/router';
import { Jinaga } from './jinaga';
import { MemoryStore } from './memory/memory-store';
import { PostgresKeystore } from './postgres/postgres-keystore';
import { PostgresStore } from './postgres/postgres-store';
import { Storage } from './storage';

export type JinagaServerConfig = {
    pgStore?: string,
    pgKeystore?: string
};

export class JinagaServer {
    static create(config: JinagaServerConfig) {
        const { pgStore, pgKeystore } = config;

        const store = createStore(config);
        const feed = new FeedImpl(store);
        const authorization = createAuthorization(config, feed);
        const router = new HttpRouter(authorization);
        const j: Jinaga = null;
        return {
            handler: router.handler,
            j
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
        const authorization = new Authorization(feed, keystore);
        return authorization;
    }
    else {
        throw new Error('Cannot yet produce a non-authorized service');
    }
}