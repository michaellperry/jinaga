import { Express, Handler } from 'express';

import { Feed } from './feed';

export class RestAPI {
    constructor(private feed: Feed) {

    }

    init(app: Express, authenticate: Handler) {
        throw new Error('Not implemented');
    }
}