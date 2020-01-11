import { expect } from 'chai';

import { AuthorizationRules, ensure, Jinaga } from '../../src';
import { Authentication } from '../../src/authentication/authentication';
import { AuthenticationNoOp } from '../../src/authentication/authentication-noop';
import { dehydrateFact } from '../../src/fact/hydrate';
import { Feed, Observable } from '../../src/feed/feed';
import { FeedImpl } from '../../src/feed/feed-impl';
import { LoginResponse } from '../../src/http/messages';
import { SyncStatusNotifier } from '../../src/http/web-client';
import { MemoryStore } from '../../src/memory/memory-store';
import { Query } from '../../src/query/query';
import { FactEnvelope, FactPath, FactRecord, FactReference } from '../../src/storage';

class AuthenticationTest implements Authentication {

  constructor (
    private inner: Feed,
    private authorization: ((a: AuthorizationRules) => AuthorizationRules) | null,
    private userFact: FactRecord | null,
    private deviceFact: FactRecord | null
  ) { }
  
  async login(): Promise<LoginResponse> {
    if (!this.userFact) {
      throw new Error("No logged in user.");
    }

    return {
      userFact: this.userFact,
      profile: {
        displayName: "Test user"
      }
    };
  }
  
  async local(): Promise<FactRecord> {
    if (!this.deviceFact) {
      throw new Error("No persistent device.");
    }

    return this.deviceFact;
  }

  from(fact: FactReference, query: Query): Observable {
    return this.inner.from(fact, query);
  }

  async save(envelopes: FactEnvelope[]): Promise<FactEnvelope[]> {
    await this.authorize(envelopes);
    return await this.inner.save(envelopes);
  }

  query(start: FactReference, query: Query): Promise<FactPath[]> {
    return this.inner.query(start, query);
  }

  exists(fact: FactReference): Promise<boolean> {
    return this.inner.exists(fact);
  }

  load(references: FactReference[]): Promise<FactRecord[]> {
    return this.inner.load(references);
  }
  
  private async authorize(envelopes: FactEnvelope[]): Promise<void> {
    
  }
}

type JinagaTestConfig = {
  authorization?: (a: AuthorizationRules) => AuthorizationRules,
  user?: {},
  device?: {}
}

class JinagaTest {
  static create(config: JinagaTestConfig) {
    const store = new MemoryStore();
    const feed = new FeedImpl(store);
    const syncStatusNotifier = new SyncStatusNotifier();
    const authentication = this.createAuthentication(config, feed);
    return new Jinaga(authentication, null, syncStatusNotifier);
  }

  static createAuthentication(config: JinagaTestConfig, inner: Feed): Authentication {
    const userFact = config.user ? dehydrateFact(config.user)[0] : null;
    const deviceFact = config.device ? dehydrateFact(config.device)[0] : null;
    
    return new AuthenticationTest(inner, config.authorization, userFact, deviceFact);
  }
}

describe("Feedback authorization", () => {
  let j: Jinaga;

  beforeEach(async () => {
    j = JinagaTest.create({
      authorization,
      user: new User("Logged in user")
    });
  });

  it("should have logged in user", async () => {
    const { userFact: user } = await j.login<User>();

    expect(user.publicKey).to.equal("Logged in user");
  });

  it("should allow a user", async () => {
    const creator = await j.fact(new User("Site creator"));

    expect(creator.publicKey).to.equal("Site creator");
  });

  it("should not allow site created by a different user", async () => {
    const creator = await j.fact(new User("Site creator"));

    const promise = j.fact(new Site(creator, "site identifier"));

    await expect(promise).to.be.rejected;
  });
});

const j = Jinaga;

class User {
  static Type = "Jinaga.User";
  type = User.Type;

  constructor (
    public publicKey: string
  ) { }
}

class Site {
  static Type = "Feedback.Site";
  type = Site.Type;

  constructor (
    public creator: User,
    public identifier: string
  ) { }

  static creator(site: Site) {
    ensure(site).has("creator");
    return j.match(site.creator);
  }
}

function authorization(a: AuthorizationRules) {
  return a
    .any(User.Type)
    .type(Site.Type, j.for(Site.creator))
    ;
}