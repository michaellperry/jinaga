import express, { Handler } from 'express';

import { HttpRouter } from './rest/router';

export class JinagaServer {
    handler: Handler;

    constructor() {
        const router = new HttpRouter();
        this.handler = router.handler;
    }
}