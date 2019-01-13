import { hydrate } from '../fact/hydrate';
import { Query } from '../query/query';
import { FactReference, FactRecord } from '../storage';
import { ServiceRunner } from '../util/serviceRunner';
import { mapAsync } from '../util/fn';
import { Feed } from './feed';

export function runService<U>(feed: Feed, start: FactReference, query: Query, serviceRunner: ServiceRunner, handler: (message: U) => Promise<void>) {
    let processing: FactRecord[] = [];
    feed.from(start, query)
        .subscribe((pathsAdded) => {
            const factsAdded = pathsAdded.map(p => p[p.length - 1]);
            serviceRunner.run(async () => {
                const recordsAdded = await feed.load(factsAdded);
                await mapAsync(recordsAdded, async (fact) => {
                    processing.push(fact);
                    const message = hydrate<U>(fact);
                    await handler(message);
                });
            });
        }, (pathsRemoved) => {
        }
    );
}
