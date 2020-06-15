import { Authentication } from './authentication/authentication';
import { AuthenticationTest } from './authentication/authentication-test';
import { AuthorizationRules } from './authorization/authorizationRules';
import { dehydrateFact, Dehydration } from './fact/hydrate';
import { Feed } from './feed/feed';
import { FeedImpl } from './feed/feed-impl';
import { SyncStatusNotifier } from './http/web-client';
import { Jinaga } from './jinaga';
import { MemoryStore } from './memory/memory-store';
import { FactEnvelope } from './storage';

export type JinagaTestConfig = {
  authorization?: (a: AuthorizationRules) => AuthorizationRules,
  user?: {},
  device?: {},
  initialState?: {}[]
}

export class JinagaTest {
  static create(config: JinagaTestConfig) {
    const store = new MemoryStore();
    this.saveInitialState(config, store);
    const feed = new FeedImpl(store);
    const syncStatusNotifier = new SyncStatusNotifier();
    const authentication = this.createAuthentication(config, feed);
    return new Jinaga(authentication, null, syncStatusNotifier);
  }

  static saveInitialState(config: JinagaTestConfig, store: MemoryStore) {
    if (config.initialState) {
      const dehydrate = new Dehydration();
      config.initialState.forEach(obj => dehydrate.dehydrate(obj));
      store.save(dehydrate.factRecords().map(f => <FactEnvelope>{
        fact: f,
        signatures: []
      }));
    }
  }

  static createAuthentication(config: JinagaTestConfig, inner: Feed): Authentication {
    const authorizationRules = config.authorization &&
      config.authorization(new AuthorizationRules());
    const userFact = config.user && dehydrateFact(config.user)[0];
    const deviceFact = config.device && dehydrateFact(config.device)[0];
    
    return new AuthenticationTest(inner, authorizationRules, userFact, deviceFact);
  }
}
