import { Authentication } from './authentication/authentication';
import { AuthenticationImpl } from './authentication/authentication-impl';
import { AuthenticationNoOp } from './authentication/authentication-noop';
import { Feed } from './feed/feed';
import { FeedImpl } from './feed/feed-impl';
import { Fork } from './fork/fork';
import { SyncStatus, SyncStatusNotifier, WebClient } from './http/web-client';
import { Jinaga, Preposition } from './jinaga';
import { MemoryStore } from './memory/memory-store';
import { Watch } from "./watch/watch";

export { Jinaga, Watch, SyncStatus, Preposition };

export type JinagaBrowserConfig = {
    httpEndpoint?: string,
    wsEndpoint?: string,
    indexedDb?: string
}

export class JinagaBrowser {
    static create(config: JinagaBrowserConfig) {
        const store = new MemoryStore();
        const feed = new FeedImpl(store);
        const syncStatusNotifier = new SyncStatusNotifier();
        const authentication = createAuthentication(config, feed, syncStatusNotifier);
        return new Jinaga(authentication, store, syncStatusNotifier);
    }
}

function createAuthentication(
    config: JinagaBrowserConfig,
    feed: Feed,
    syncStatusNotifier: SyncStatusNotifier
): Authentication {
    if (config.httpEndpoint) {
        const webClient = new WebClient(config.httpEndpoint, syncStatusNotifier);
        const fork = new Fork(feed, webClient);
        const authentication = new AuthenticationImpl(fork, webClient);
        return authentication;
    }
    else {
        const authentication = new AuthenticationNoOp(feed);
        return authentication;
    }
}