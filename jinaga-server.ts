import express from 'express';

type Handler = express.Handler;

export class JinagaServer {
    handler: Handler;

    constructor() {
        const router = express.Router();
        router.get('/login', (req, res, next) => {
            res.send({
                userFact: {

                },
                profile: {
                    displayName: 'Called Server'
                }
            });
            next();
        });
        this.handler = router;
    }
}