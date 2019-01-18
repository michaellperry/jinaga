import { expect } from "chai";
import { Cache } from "../../src/cache";
import { dehydrateFact, dehydrateReference } from "../../src/fact/hydrate";
import { MemoryStore } from "../../src/memory/memory-store";
import { Query } from "../../src/query/query";
import { FactRecord, FactReference, Storage } from "../../src/storage";

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

    it('should return only ancestors from cache', async () => {
        const comment1 = { type: 'Comment', createdAt: '2019-01-16T18:34:23.381Z', post: {
            type: 'Post', slug: 'constructors', blog: {
                type: 'Root', identifier: 'qedcode'
        }}};
        const comment2 = { type: 'Comment', createdAt: '2019-02-16T18:34:23.381Z', post: {
            type: 'Post', slug: 'factories', blog: {
                type: 'Root', identifier: 'qedcode'
        }}};
        const records1 = dehydrateFact(comment1);
        const records = records1.concat(dehydrateFact(comment2));
        const reference1 = dehydrateReference(comment1);
        const reference2 = dehydrateReference(comment2);
        const { cache } = givenStoreWith(records);
        
        await cache.load([reference1, reference2]);
        const results = await cache.load([reference1]);
        expect(results).to.have.members(records1);
    });

    it('should return distinct facts from cache', async () => {
        const parent = { type: 'Parent', identifier: 'qedcode' };
        const child1 = { type: 'Child', ordinal: 1, parent };
        const child2 = { type: 'Child', ordinal: 2, parent };
        const child3 = { type: 'Child', ordinal: 3, parent };
        const reference1 = dehydrateReference(child1);
        const reference2 = dehydrateReference(child2);
        const reference3 = dehydrateReference(child3);

        const {cache} = givenStoreWith([].concat(
            dehydrateFact(child1),
            dehydrateFact(child2),
            dehydrateFact(child3)
        ));
        
        const result1 = await cache.load([ reference1, reference2, reference3 ]);
        expect(result1.length).to.equal(4);
        const result2 = await cache.load([ reference1, reference2, reference3 ]);
        expect(result2.length).to.equal(4);
    });
});