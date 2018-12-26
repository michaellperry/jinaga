import { Authentication } from './authentication/authentication';
import { AuthenticationImpl } from './authentication/authentication-impl';
import { AuthenticationNoOp } from './authentication/authentication-noop';
import { Feed } from './feed/feed';
import { FeedImpl } from './feed/feed-impl';
import { Fork } from './fork/fork';
import { WebClient } from './http/web-client';
import { Jinaga } from './jinaga';
import { MemoryStore } from './memory/memory-store';

export type JinagaBrowserConfig = {
    httpEndpoint?: string,
    wsEndpoint?: string,
    indexedDb?: string
}

export class JinagaBrowser {
    static create(config: JinagaBrowserConfig) {
        const store = new MemoryStore();
        const feed = new FeedImpl(store);
        const authentication = createAuthentication(config, feed);
        return new Jinaga(authentication, store);
    }
}

function createAuthentication(config: JinagaBrowserConfig, feed: Feed): Authentication {
    if (config.httpEndpoint) {
        const webClient = new WebClient(config.httpEndpoint);
        const fork = new Fork(feed, webClient);
        const authentication = new AuthenticationImpl(fork, webClient);
        return authentication;
    }
    else {
        const authentication = new AuthenticationNoOp(feed);
        return authentication;
    }
}