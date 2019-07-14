import { Authentication } from '../authentication/authentication';
import { Feed, Observable } from '../feed/feed';
import { LoginResponse } from '../http/messages';
import { WebClient } from '../http/web-client';
import { IndexedDBStore } from '../indexeddb/indexeddb-store';
import { Query } from '../query/query';
import { FactEnvelope, FactRecord, FactReference } from '../storage';
import { Trace } from '../util/trace';

export class AuthenticationServiceWorker implements Authentication {
  constructor(private inner: Feed, private store: IndexedDBStore, private client: WebClient) {
  }

  async login() {    
    try {
      return await this.loginRemote();
    }
    catch (err) {
      Trace.warn(err.message ? err.message : err);
      try {
        return await this.loginLocal();
      }
      catch (err2) {
        Trace.warn(err2.message ? err2.message : err2);
        throw err;
      }
    }
  }

  local(): Promise<FactRecord> {
    throw new Error('Local device has no persistence.');
  }

  async save(envelopes: FactEnvelope[]): Promise<FactEnvelope[]> {
    const saved = await this.inner.save(envelopes);
    return saved;
  }

  query(start: FactReference, query: Query) {
    return this.inner.query(start, query);
  }

  exists(fact: FactReference): Promise<boolean> {
    throw new Error("Exists method not implemented on AuthenticationImpl.");
  }

  async load(references: FactReference[]): Promise<FactRecord[]> {
    const facts = await this.inner.load(references);
    await this.store.save(facts.map(fact => ({ signatures: [], fact })));
    return facts;
  }

  from(fact: FactReference, query: Query): Observable {
    return this.inner.from(fact, query);
  }

  private async loginRemote() {
    const result = await this.client.login();
    if (result && result.userFact && result.profile) {
      await this.store.saveLogin('token', result.userFact, result.profile.displayName);
      await this.store.save([ { signatures: [], fact: result.userFact } ]);
    }
    return result;
  }

  private async loginLocal(): Promise<LoginResponse> {
    const result = await this.store.loadLogin('token');
    return {
      userFact: result.userFact,
      profile: {
        displayName: result.displayName
      }
    };
  }
}