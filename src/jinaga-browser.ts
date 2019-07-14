import { Authentication } from './authentication/authentication';
import { AuthenticationImpl } from './authentication/authentication-impl';
import { AuthenticationNoOp } from './authentication/authentication-noop';
import { Feed } from './feed/feed';
import { FeedImpl } from './feed/feed-impl';
import { Fork } from './fork/fork';
import { SyncStatus, SyncStatusNotifier, WebClient } from './http/web-client';
import { XhrConnection } from './http/xhr';
import { ensure, FactDescription, Jinaga, Preposition, Trace, Tracer } from './jinaga';
import { MemoryStore } from './memory/memory-store';
import { Watch } from "./watch/watch";
import { IndexedDBStore } from './indexeddb/indexeddb-store';
import { Storage } from './storage';
import { AuthenticationServiceWorker } from './service-worker/authentication';

export { Jinaga, Watch, SyncStatus, Preposition, Trace, Tracer, ensure, FactDescription };

export type JinagaBrowserConfig = {
    httpEndpoint?: string,
    wsEndpoint?: string,
    indexedDb?: string
}

export class JinagaBrowser {
    static create(config: JinagaBrowserConfig) {
        const store = createStore(config);
        const feed = new FeedImpl(store);
        const syncStatusNotifier = new SyncStatusNotifier();
        const authentication = createAuthentication(config, feed, syncStatusNotifier);
        return new Jinaga(authentication, null, syncStatusNotifier);
    }
}

function createStore(config: JinagaBrowserConfig): Storage {
  if (config.indexedDb) {
    return new IndexedDBStore(config.indexedDb);
  }
  else {
    return new MemoryStore();
  }
}

function createAuthentication(
    config: JinagaBrowserConfig,
    feed: Feed,
    syncStatusNotifier: SyncStatusNotifier
): Authentication {
    if (config.httpEndpoint) {
        const httpConnection = new XhrConnection(config.httpEndpoint);
        const webClient = new WebClient(httpConnection, syncStatusNotifier);
        const fork = new Fork(feed, webClient);
        if (config.indexedDb) {
            const loginStore = new IndexedDBStore(config.indexedDb);
            const authentication = new AuthenticationServiceWorker(fork, loginStore, webClient);
            return authentication;
        }
        else {
            const authentication = new AuthenticationImpl(fork, webClient);
            return authentication;
        }
    }
    else {
        const authentication = new AuthenticationNoOp(feed);
        return authentication;
    }
}