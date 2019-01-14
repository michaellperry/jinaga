import { Hydration } from '../fact/hydrate';
import { Query } from '../query/query';
import { FactReference } from '../storage';
import { mapAsync } from '../util/fn';
import { ServiceRunner } from '../util/serviceRunner';
import { Feed } from './feed';

export function runService<U>(feed: Feed, start: FactReference, query: Query, serviceRunner: ServiceRunner, handler: (message: U) => Promise<void>) {
    let processing: FactReference[] = [];
    const subscription = feed.from(start, query)
        .subscribe((pathsAdded) => {
            const factsAdded = pathsAdded.map(p => p[p.length - 1]);
            serviceRunner.run(async () => {
                const recordsAdded = await feed.load(factsAdded);
                const hydration = new Hydration(recordsAdded);
                await mapAsync(factsAdded, async reference => {
                    processing.push(reference);
                    const fact = <U>hydration.hydrate(reference);
                    await handler(fact);
                });
            });
        }, (pathsRemoved) => {
        }
    );
    return subscription;
}
