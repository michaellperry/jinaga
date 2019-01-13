import { expect } from "chai";
import { dehydrateReference } from "../../src/fact/hydrate";
import { FeedImpl } from "../../src/feed/feed-impl";
import { runService } from "../../src/feed/service";
import { MemoryStore } from "../../src/memory/memory-store";
import { fromDescriptiveString } from "../../src/query/descriptive-string";
import { ServiceRunner } from "../../src/util/serviceRunner";

class TestContext {
    private store = new MemoryStore();
    private feed = new FeedImpl(this.store);
    private exceptions: any[] = [];
    private serviceRunner = new ServiceRunner(exception => this.exceptions.push(exception));

    run(fact: {}, queryString: string, handler: (message: {}) => Promise<void>) {
        const start = dehydrateReference(fact);
        const query = fromDescriptiveString(queryString);
        runService(this.feed, start, query, this.serviceRunner, handler);
    }

    async stop() {
        await this.serviceRunner.all();
    }

    expectNoExceptions() {
        expect(this.exceptions).to.deep.equal([]);
    }
}

describe('Service', () => {
    it('should not run for empty store', async () => {
        const context = new TestContext();

        let runs = 0;
        context.run({
            type: 'Start',
            value: 1
        }, 'S.parent F.type="Child"', async (message) => { ++runs; });
        await context.stop();
        context.expectNoExceptions();
        expect(runs).to.equal(0);
    });
});