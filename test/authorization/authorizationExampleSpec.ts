import { expect } from 'chai';

import { AuthorizationRules, ensure, Jinaga } from '../../src';
import { Authentication } from '../../src/authentication/authentication';
import { AuthenticationTest } from '../../src/authentication/authentication-test';
import { dehydrateFact } from '../../src/fact/hydrate';
import { Feed } from '../../src/feed/feed';
import { FeedImpl } from '../../src/feed/feed-impl';
import { SyncStatusNotifier } from '../../src/http/web-client';
import { MemoryStore } from '../../src/memory/memory-store';

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
    const authorizationRules = config.authorization &&
      config.authorization(new AuthorizationRules());
    const userFact = config.user && dehydrateFact(config.user)[0];
    const deviceFact = config.device && dehydrateFact(config.device)[0];
    
    return new AuthenticationTest(inner, authorizationRules, userFact, deviceFact);
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