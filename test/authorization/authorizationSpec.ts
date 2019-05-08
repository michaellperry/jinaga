import { expect } from "chai";
import { AuthorizationKeystore } from "../../src/authorization/authorization-keystore";
import { AuthorizationRules } from "../../src/authorization/authorizationRules";
import { dehydrateFact, hydrate } from "../../src/fact/hydrate";
import { FeedImpl } from "../../src/feed/feed-impl";
import { Jinaga as j, ensure } from "../../src/jinaga";
import { MemoryKeystore } from "../../src/memory/memory-keystore";
import { MemoryStore } from "../../src/memory/memory-store";
import { FactRecord } from "../../src/storage";

const chaiAsPromised = require("chai-as-promised");
const chai = require("chai");

chai.use(chaiAsPromised);

describe('Authorization', () => {
    it('should authorize empty save', async () => {
        const authorization = givenAuthorization();
        const result = await whenSave(authorization, []);
        expect(result.length).to.equal(0);
    });

    it('should save a new fact', async () => {
        const authorization = givenAuthorization();
        const result = await whenSave(authorization, dehydrateFact({
            type: 'Hashtag',
            word: 'vorpal'
        }));
        expect(result.length).to.equal(1);
    });

    it('should save a fact once', async () => {
        const authorization = givenAuthorization();
        const facts = dehydrateFact({
            type: 'Hashtag',
            word: 'vorpal'
        });
        await whenSave(authorization, facts);
        const result = await whenSave(authorization, facts);
        expect(result.length).to.equal(0);
    });

    it('should reject a fact from an unauthorized user', async () => {
        const authorization = givenAuthorization();
        const mickeyMouse = givenOtherUser();
        const promise = whenSave(authorization, dehydrateFact({
            type: 'Tweet',
            message: 'Twas brillig',
            sender: mickeyMouse
        }));
        await expect(promise).to.be.rejected;
    });

    it('should accept a fact from an authorized user', async () => {
        const authorization = givenAuthorization();
        const lewiscarrol = await givenLoggedInUser(authorization);
        const result = await whenSave(authorization, dehydrateFact({
            type: 'Tweet',
            message: 'Twas brillig',
            sender: lewiscarrol
        }));
        expect(result.length).to.be.greaterThan(0);
    });

    it('should accept a predecessor from an authorized user', async () => {
        const authorization = givenAuthorization();
        const lewiscarrol = await givenLoggedInUser(authorization);
        const result = await whenSave(authorization, dehydrateFact({
            type: 'Like',
            user: lewiscarrol,
            tweet: {
                type: 'Tweet',
                message: 'Twas Brillig',
                sender: lewiscarrol
            }
        }));
        expect(result.filter(r => r.type === 'Tweet').length).to.equal(1);
    });

    it('should reject a predecessor from an unauthorized user', async () => {
        const authorization = givenAuthorization();
        const lewiscarrol = await givenLoggedInUser(authorization);
        const mickeyMouse = givenOtherUser();
        const promise = whenSave(authorization, dehydrateFact({
            type: 'Like',
            user: lewiscarrol,
            tweet: {
                type: 'Tweet',
                message: 'Hiya, Pal!',
                sender: mickeyMouse
            }
        }));
        await expect(promise).to.be.rejected;
    });

    it('should accept a pre-existing predecessor from an unauthorized user', async () => {
        const storage = givenStorage();
        const mickeyMouse = givenOtherUser();
        const tweet = {
            type: 'Tweet',
            message: 'Hiya, Pal!',
            sender: mickeyMouse
        };
        await storage.save(dehydrateFact(tweet).map(f => ({ fact: f, signatures: [] })));

        const authorization = givenAuthorizationWithStorage(storage);
        const lewiscarrol = await givenLoggedInUser(authorization);
        const result = await whenSave(authorization, dehydrateFact({
            type: 'Like',
            user: lewiscarrol,
            tweet: tweet
        }));
        expect(result.length).to.be.greaterThan(0);
        expect(result.filter(r => r.type === 'Tweet').length).to.equal(0);
    });

    it('should accept a fact authorized by predecessor', async () => {
        const authorization = givenAuthorization();
        const lewiscarrol = await givenLoggedInUser(authorization);
        const tweet = {
            type: 'Tweet',
            message: 'Twas brillig',
            sender: lewiscarrol
        };
        await whenSave(authorization, dehydrateFact(tweet));

        const result = await whenSave(authorization, dehydrateFact({
            type: 'Delete',
            tweet: tweet
        }));
        expect(result.length).to.be.greaterThan(0);
    });

    it('should accept a fact based on in-flight predecessor', async () => {
        const authorization = givenAuthorization();
        const lewiscarrol = await givenLoggedInUser(authorization);
        const tweet = {
            type: 'Tweet',
            message: 'Twas brillig',
            sender: lewiscarrol
        };
        // Note that this is missing.
        // await whenSave(authorization, dehydrateFact(tweet));
        
        const result = await whenSave(authorization, dehydrateFact({
            type: 'Delete',
            tweet: tweet
        }));
        expect(result.length).to.be.greaterThan(0);
    });

    it('should authorize catalog access', async () => {
        const authorization = givenAuthorizationRules(a => a
            .any('Jinaga.User')
            .type('ImprovingU.Company', j.for(creator))
            .any('ImprovingU.Semester')
            .any('ImprovingU.Catalog')
            .type('ImprovingU.Catalog.Access', j.for(catalog).then(semester).then(company).then(creator))
            .any('ImprovingU.Catalog.AccessRequest.Response')
            );
        const user = await givenLoggedInUser(authorization);
        const access = {
            "from": user,
            "accessRequest": {
                "createdAt": "2019-05-06T15:22:55.906Z",
                "type": "ImprovingU.Catalog.AccessRequest",
                "from": {
                    "publicKey": "-----BEGIN PUBLIC KEY-----\r\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArzy94kEgtlyDLTkGlac+\r\nnpMlL2uTqWr0nrNpOA77P/lg2q8daZ05yn6y8KLB8txLhHtzjz6eAEBEbiXhLHTI\r\nuJoYv8vSsM+ZpmsotIrV2RaZpvrHU0VHiNrgzNl2rjiW5DDy6vSUnvXSpdE+S1zG\r\n548xr/iVaapTaUoW4u+xxp3r/3yaznd+T3dBNJ+jxmcYzyZUAyaqIHCDmV8pCOVx\r\n2/wsIO6z2pVr0UuhR1CJv4ok8cwtfsOIOaAf6Q73rrE6exTaJz/vX54y8GTJhyr+\r\nRmX/WBLCFJfvICXqQrT/Yqh6fuwe8+Ovnrfk3dBf8bwkgMd+JljiRe1U6F4cpeWC\r\nfwIDAQAB\r\n-----END PUBLIC KEY-----\r\n",
                    "type": "Jinaga.User"
                },
                "catalog": {
                    "office": "Dallas",
                    "type": "ImprovingU.Catalog",
                    "_in": {
                        "name": "Summer 2019",
                        "type": "ImprovingU.Semester",
                        "company": {
                            "name": "Improving",
                            "type": "ImprovingU.Company",
                            "from": user
                        }
                    }
                }
            },
            "authorization": [
                {
                    "to": {
                        "publicKey": "-----BEGIN PUBLIC KEY-----\r\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArzy94kEgtlyDLTkGlac+\r\nnpMlL2uTqWr0nrNpOA77P/lg2q8daZ05yn6y8KLB8txLhHtzjz6eAEBEbiXhLHTI\r\nuJoYv8vSsM+ZpmsotIrV2RaZpvrHU0VHiNrgzNl2rjiW5DDy6vSUnvXSpdE+S1zG\r\n548xr/iVaapTaUoW4u+xxp3r/3yaznd+T3dBNJ+jxmcYzyZUAyaqIHCDmV8pCOVx\r\n2/wsIO6z2pVr0UuhR1CJv4ok8cwtfsOIOaAf6Q73rrE6exTaJz/vX54y8GTJhyr+\r\nRmX/WBLCFJfvICXqQrT/Yqh6fuwe8+Ovnrfk3dBf8bwkgMd+JljiRe1U6F4cpeWC\r\nfwIDAQAB\r\n-----END PUBLIC KEY-----\r\n",
                        "type": "Jinaga.User"
                    },
                    "write": {
                        "office": "Dallas",
                        "type": "ImprovingU.Catalog",
                        "_in": {
                            "name": "Summer 2019",
                            "type": "ImprovingU.Semester",
                            "company": {
                                "name": "Improving",
                                "type": "ImprovingU.Company",
                                "from": user
                            }
                        }
                    },
                    "createdAt": "2019-05-08T11:32:41.185Z",
                    "type": "ImprovingU.Catalog.Access"
                }
            ],
            "type": "ImprovingU.Catalog.AccessRequest.Response"
        };
        function catalog(access: any) {
            (<any>access).has('write');
            return j.match(access.write);
        }
        function semester(c: any) {
            (<any>c).has('_in');
            return j.match(c._in);
        }
        function company(s: any) {
            (<any>s).has('company');
            return j.match(s.company);
        }
        function creator(c: any) {
            (<any>c).has('from');
            return j.match(c.from);
        }

        const result = await whenSave(authorization, dehydrateFact(access));
        expect(result.length).to.be.greaterThan(0);
    });
});

function givenAuthorizationRules(authorize: (a: AuthorizationRules) => AuthorizationRules) {
    const storage = givenStorage();
    const keystore = new MemoryKeystore();
    const feed = new FeedImpl(storage);
    const authorizationRules = authorize(new AuthorizationRules());
    return new AuthorizationKeystore(feed, keystore, authorizationRules);
}

function givenAuthorization() {
    const storage = givenStorage();
    return givenAuthorizationWithStorage(storage);
}

function givenStorage() {
    return new MemoryStore();
}

function givenAuthorizationWithStorage(storage: MemoryStore) {
    const keystore = new MemoryKeystore();
    const feed = new FeedImpl(storage);
    const authorizationRules = new AuthorizationRules()
        .any('Hashtag')
        .no('Jinaga.User')
        .type('Tweet', j.for(tweetSender))
        .type('Like', j.for(likeUser))
        .type('Delete', j.for(deleteSender))
        ;
    return new AuthorizationKeystore(feed, keystore, authorizationRules);
}

function givenOtherUser() {
    return {
        type: 'Jinaga.User',
        publicKey: 'other'
    };
}

async function givenLoggedInUser(authorization: AuthorizationKeystore) {
    const userIdentity = givenMockUserIdentity();
    const userFact = await authorization.getUserFact(userIdentity);
    const user = hydrate<{}>(userFact);
    return user;
}

function givenMockUserIdentity() {
    return {
        provider: 'mock',
        id: 'user'
    };
}

async function whenSave(authorization: AuthorizationKeystore, facts: FactRecord[]) {
    const userIdentity = givenMockUserIdentity();
    const result = await authorization.save(userIdentity, facts);
    return result;
}

function tweetSender(t: { sender: {} }) {
    ensure(t).has("sender");

    return j.match(t.sender);
}

function likeUser(l: { user: {} }) {
    ensure(l).has("user");

    return j.match(l.user);
}

function deleteSender(d: { tweet: { sender: {} } }) {
    ensure(d).has("tweet").has("sender");

    return j.match(d.tweet.sender);
}