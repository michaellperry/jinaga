import express, { Handler } from 'express';

import { Authorization } from './authorization';
import { Cache } from './cache';
import { Feed } from './feed';
import { MongoKeystore } from './mongo/mongo-keystore';
import { MongoStore } from './mongo/mongo-store';
import { HttpRouter } from './rest/router';

export class JinagaServer {
    handler: Handler;

    constructor(mongoUrl: string, mongoDbName: string, poolMaxAge: number) {
        const store = new MongoStore(mongoUrl, mongoDbName, poolMaxAge);
        const cache = new Cache(store);
        const feed = new Feed(cache);
        const keystore = new MongoKeystore(mongoUrl, mongoDbName, poolMaxAge);
        const authorization = new Authorization(feed, keystore);
        const router = new HttpRouter(authorization);
        this.handler = router.handler;
    }
}