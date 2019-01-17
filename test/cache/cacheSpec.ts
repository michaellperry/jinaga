import { Cache } from "../../src/cache";
import { MemoryStore } from "../../src/memory/memory-store";
import { expect } from "chai";
import { dehydrateFact, dehydrateReference } from "../../src/fact/hydrate";
import { Storage, FactRecord, FactReference } from "../../src/storage";
import { Query } from "../../src/query/query";

class StorageProxy implements Storage {
    public loadCount = 0;

    constructor(
        private inner: Storage
    ) { }

    save(facts: FactRecord[]): Promise<FactRecord[]> {
        return this.inner.save(facts);
    }
    
    query(start: FactReference, query: Query): Promise<FactReference[][]> {
        return this.inner.query(start, query);
    }

    exists(fact: FactReference): Promise<boolean> {
        return this.inner.exists(fact);
    }

    load(references: FactReference[]): Promise<FactRecord[]> {
        this.loadCount++;
        return this.inner.load(references);
    }
}

describe('Cache', () => {
    function givenStoreWith(records: FactRecord[]) {
        const memory = new MemoryStore();
        memory.save(records);
        const proxy = new StorageProxy(memory);
        const cache = new Cache(proxy);
        return { proxy, cache };
    }

    it('should return empty result', async () => {
        const { cache } = givenStoreWith([]);

        const results = await cache.load([]);
        expect(results).to.have.members([]);
    });

    it('should pass first request through to storage', async () => {
        const fact = { type: 'Root', identifier: 'qedcode' };
        const records = dehydrateFact(fact);
        const reference = dehydrateReference(fact);
        const { cache, proxy } = givenStoreWith(records);

        const results = await cache.load([reference]);
        expect(results).to.have.members(records);
        expect(proxy.loadCount).to.equal(1);
    });

    it('should serve second request from cache', async () => {
        const fact = { type: 'Root', identifier: 'qedcode' };
        const records = dehydrateFact(fact);
        const reference = dehydrateReference(fact);
        const { cache, proxy } = givenStoreWith(records);

        await cache.load([reference]);
        const results = await cache.load([reference]);
        expect(results).to.have.members(records);
        expect(proxy.loadCount).to.equal(1);
    });

    it('should return predecessors from second request', async () => {
        const fact = { type: 'Post', slug: 'constructors', blog: {
            type: 'Root', identifier: 'qedcode'
        }};
        const records = dehydrateFact(fact);
        const reference = dehydrateReference(fact);
        const { cache, proxy } = givenStoreWith(records);

        await cache.load([reference]);
        const results = await cache.load([reference]);
        expect(results).to.have.members(records);
        expect(proxy.loadCount).to.equal(1);
    });

    it('should return all ancestors from second request', async () => {
        const fact = { type: 'Comment', createdAt: '2019-01-16T18:34:23.381Z', post: {
            type: 'Post', slug: 'constructors', blog: {
                type: 'Root', identifier: 'qedcode'
        }}};
        const records = dehydrateFact(fact);
        const reference = dehydrateReference(fact);
        const { cache, proxy } = givenStoreWith(records);
        
        await cache.load([reference]);
        const results = await cache.load([reference]);
        expect(results).to.have.members(records);
        expect(proxy.loadCount).to.equal(1);
    });
});