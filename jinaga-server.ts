import { PostgresKeystore } from './postgres/postgres-keystore';
import { PostgresStore } from './postgres/postgres-store';
import express, { Handler } from 'express';

import { Authorization } from './authorization';
import { Cache } from './cache';
import { Feed } from './feed';
import { HttpRouter } from './http/router';

export class JinagaServer {
    handler: Handler;

    constructor(postgresUri: string) {
        const store = new PostgresStore(postgresUri);
        const cache = new Cache(store);
        const feed = new Feed(cache);
        const keystore = new PostgresKeystore(postgresUri);
        const authorization = new Authorization(feed, keystore);
        const router = new HttpRouter(authorization);
        this.handler = router.handler;
    }
}