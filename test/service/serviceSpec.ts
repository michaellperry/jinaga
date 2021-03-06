import { expect } from "chai";
import { dehydrateReference, dehydrateFact } from "../../src/fact/hydrate";
import { FeedImpl } from "../../src/feed/feed-impl";
import { runService } from "../../src/feed/service";
import { MemoryStore } from "../../src/memory/memory-store";
import { fromDescriptiveString } from "../../src/query/descriptive-string";
import { ServiceRunner } from "../../src/util/serviceRunner";

class TestContext {
    private store = new MemoryStore();
    private feed = new FeedImpl(this.store);
    private exceptions: any[] = [];
    private serviceRunner = new ServiceRunner(exception => this.exceptions.push(exception.message));

    async fact(fact: {}) {
        const records = dehydrateFact(fact);
        const envelopes = records.map(f => ({ fact: f, signatures: [] }));
        await this.feed.save(envelopes);
    }

    async run(fact: {}, queryString: string, handler: (message: {}) => Promise<void>) {
        try {
            const start = dehydrateReference(fact);
            const query = fromDescriptiveString(queryString);
            const subscription = runService(this.feed, start, query, this.serviceRunner, handler);
            await subscription.load();
        }
        catch (exception) {
            this.exceptions.push(exception.message);
        }
    }

    async stop() {
        await this.serviceRunner.all();
    }

    expectNoExceptions() {
        expect(this.exceptions).to.deep.equal([]);
    }

    expectExceptions(expected: string[]) {
        expect(this.exceptions).to.deep.equal(expected);
    }
}

describe('Service', () => {
    it('should not run for empty store', async () => {
        const context = new TestContext();

        const start = {
            type: 'Start',
            value: 1
        };
        let runs = 0;
        await context.run(start, 'S.parent F.type="Child"', async _ => { ++runs; });
        await context.stop();
        context.expectNoExceptions();
        expect(runs).to.equal(0);
    });

    it('should run for existing fact', async () => {
        const context = new TestContext();

        const start = {
            type: 'Start',
            value: 1
        };
        await context.fact({
            type: 'Child',
            parent: start
        });
        let runs = 0;
        await context.run(start, 'S.parent F.type="Child" N(S.child F.type="Handled")', async child => {
            ++runs;
            await context.fact({
                type: 'Handled',
                child: child
            });
        });
        await context.stop();
        context.expectNoExceptions();
        expect(runs).to.equal(1);
    });

    it('should run for new fact', async () => {
        const context = new TestContext();

        const start = {
            type: 'Start',
            value: 1
        };
        let runs = 0;
        await context.run(start, 'S.parent F.type="Child" N(S.child F.type="Handled")', async child => {
            ++runs;
            await context.fact({
                type: 'Handled',
                child: child
            });
        });
        await context.fact({
            type: 'Child',
            parent: start
        });
        await context.stop();
        context.expectNoExceptions();
        expect(runs).to.equal(1);
    });

    it('should fail if handler does not remove fact', async () => {
        const context = new TestContext();

        const start = {
            type: 'Start',
            value: 1
        };
        await context.fact({
            type: 'Child',
            parent: start
        });
        let runs = 0;
        await context.run(start, 'S.parent F.type="Child" N(S.child F.type="Handled")', async child => {
            ++runs;
        });
        await context.stop();
        context.expectExceptions([
            'The handler did not remove the processed message from the query \'S.parent F.type="Child" N(S.child F.type="Handled")\'. This process will be duplicated the next time the service is run.'
        ]);
        expect(runs).to.equal(1);
    });
});