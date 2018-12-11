import { Authentication } from "../../src/authentication/authentication";
import { Feed, Observable } from "../../src/feed/feed";
import { FeedImpl } from "../../src/feed/feed-impl";
import { LoginResponse } from "../../src/http/messages";
import { Query } from "../../src/query/query";
import { FactRecord, FactReference, Storage } from "../../src/storage";

export class MockAuthentication implements Authentication {
  private inner: Feed;

  constructor(
      storage: Storage
  ) {
      this.inner = new FeedImpl(storage);
  }

  login(): Promise<LoginResponse> {
      throw new Error("Method not implemented: login.");
  }
  local(): Promise<FactRecord> {
      throw new Error("Method not implemented: local.");
  }
  from(fact: FactReference, query: Query): Observable {
      return this.inner.from(fact, query);
  }
  save(facts: FactRecord[]): Promise<FactRecord[]> {
      return this.inner.save(facts);
  }
  query(start: FactReference, query: Query): Promise<FactReference[][]> {
      return this.inner.query(start, query);
  }
  exists(fact: FactReference): Promise<boolean> {
    throw new Error("Exists method not implemented on MockAuthentication.");
  }
  load(references: FactReference[]): Promise<FactRecord[]> {
      return this.inner.load(references);
  }
}
