import express, { Handler, Request } from 'express';

import { Authorization } from '../authorization';
import { LoginResponse, ProfileMessage, QueryMessage } from './messages';
import { FactReference, FactRecord } from '../storage';
import { Query } from '../query/query';
import { UserIdentity } from '../keystore';
import { fromDescriptiveString } from '../query/descriptive-string';

function get<U>(method: ((req: RequestUser) => Promise<U>)): Handler {
    return (req, res, next) => {
        const user = <RequestUser>req.user;
        if (!user) {
            res.sendStatus(401);
        }
        method(user)
            .then(response => {
                res.send(JSON.stringify(response));
                next();
            })
            .catch(error => {
                console.error(error);
                res.sendStatus(500);
                next();
            });
    };
}

function post<T, U>(method: (user: RequestUser, message: T) => Promise<U>): Handler {
    return (req, res, next) => {
        const user = <RequestUser>req.user;
        const message = <T>req.body;
        method(user, message)
            .then(response => {
                res.send(JSON.stringify(response));
                next();
            })
            .catch(error => {
                console.error(error);
                res.sendStatus(500);
                next();
            });
    };
}

export interface RequestUser {
    provider: string;
    id: string;
    profile: ProfileMessage;
}

export class HttpRouter {
    handler: Handler;

    constructor(private authorization: Authorization) {
        const router = express.Router();
        router.get('/login', get(req => this.login(req)));
        router.post('/query', post((user, queryMessage: QueryMessage) => this.query(user, queryMessage)));
        this.handler = router;
    }

    private async login(user: RequestUser) {
        const userFact = await this.authorization.getUserFact({
            provider: user.provider,
            id: user.id
        });
        return {
            userFact: userFact,
            profile: user.profile
        };
    }

    private async query(user: RequestUser, queryMessage: QueryMessage) {
        const userIdentity = {
            provider: user.provider,
            id: user.id
        };
        const start = {
            type: queryMessage.start.type,
            hash: queryMessage.start.hash
        };
        const query = fromDescriptiveString(queryMessage.query);
        const result = await this.authorization.query(userIdentity, start, query);
        return result;
    }
}