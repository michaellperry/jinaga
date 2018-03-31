import express, { Handler } from 'express';

import { Authorization } from '../authorization';
import { LoginResponse } from './messages';

function get(method: (() => Promise<{}>)): Handler {
    return (req, res, next) => {
        method()
            .then(response => {
                res.send(response);
                next();
            })
            .catch(error => {
                console.error(error);
                res.sendStatus(500);
                next();
            });
    };
}

export class HttpRouter {
    handler: Handler;

    constructor(authorization: Authorization) {
        const router = express.Router();
        router.get('/login', get(this.login));
        this.handler = router;
    }

    private async login(): Promise<LoginResponse> {
        return {
            userFact: {

            },
            profile: {
                displayName: 'Called Server'
            }
        };
    }
}