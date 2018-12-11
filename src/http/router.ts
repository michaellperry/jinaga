import { Handler, Router } from 'express';
import { Authorization } from '../authorization';
import { computeHash } from '../fact/hash';
import { UserIdentity } from '../keystore';
import { fromDescriptiveString } from '../query/descriptive-string';
import { FactRecord, FactReference } from '../storage';
import { LoadMessage, LoadResponse, ProfileMessage, QueryMessage, QueryResponse, SaveMessage, SaveResponse } from './messages';


function get<U>(method: ((req: RequestUser) => Promise<U>)): Handler {
    return (req, res, next) => {
        const user = <RequestUser>req.user;
        if (!user) {
            res.sendStatus(401);
        }
        else {
            method(user)
                .then(response => {
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify(response));
                    next();
                })
                .catch(error => {
                    console.error(error);
                    res.sendStatus(500);
                    next();
                });
        }
    };
}

function post<T, U>(method: (user: RequestUser, message: T) => Promise<U>): Handler {
    return (req, res, next) => {
        const user = <RequestUser>req.user;
        const message = <T>req.body;
        method(user, message)
            .then(response => {
                res.setHeader('Content-Type', 'application/json');
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

function serializeFactReferenceFromFact(factRecord: FactRecord) : FactReference {
    return {
        type: factRecord.type,
        hash: computeHash(factRecord.fields, factRecord.predecessors)
    };
}

function serializeUserIdentity(user: RequestUser) : UserIdentity {
    if (!user) {
        return null;
    }
    return {
        provider: user.provider,
        id: user.id
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
        const router = Router();
        router.get('/login', get(user => this.login(user)));
        router.post('/query', post((user, queryMessage: QueryMessage) => this.query(user, queryMessage)));
        router.post('/load', post((user, loadMessage: LoadMessage) => this.load(user, loadMessage)));
        router.post('/save', post((user, saveMessage: SaveMessage) => this.save(user, saveMessage)));
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

    private async query(user: RequestUser, queryMessage: QueryMessage) : Promise<QueryResponse> {
        const userIdentity = serializeUserIdentity(user);
        const query = fromDescriptiveString(queryMessage.query);
        const result = await this.authorization.query(userIdentity, queryMessage.start, query);
        return {
            results: result
        };
    }

    private async load(user: RequestUser, loadMessage: LoadMessage) : Promise<LoadResponse> {
        const userIdentity = serializeUserIdentity(user);
        const result = await this.authorization.load(userIdentity, loadMessage.references);
        return {
            facts: result
        };
    }

    private async save(user: RequestUser, saveMessage: SaveMessage) : Promise<SaveResponse> {
        const userIdentity = serializeUserIdentity(user);
        await this.authorization.save(userIdentity, saveMessage.facts);
        return {};
    }
}