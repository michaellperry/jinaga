import { Authorization } from './authorization';
import { Feed } from './feed';
import { Cache } from './cache';
import { MongoStore } from './mongo-store';
import express, { Handler } from 'express';

import { HttpRouter } from './rest/router';

export class JinagaServer {
    handler: Handler;

    constructor() {
        const store = new MongoStore();
        const cache = new Cache(store);
        const feed = new Feed(cache);
        const authorization = new Authorization(feed);
        const router = new HttpRouter(authorization);
        this.handler = router.handler;
    }
}