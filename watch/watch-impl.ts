import { hydrateFromTree } from '../fact/hydrate';
import { Feed, Observable, Subscription } from '../feed/feed';
import { Query } from '../query/query';
import { FactReference } from '../storage';
import { Watch } from './watch';

export class WatchImpl<Fact, Model> implements Watch {
    private subscription: Subscription;

    constructor(
        private start: FactReference,
        private query: Query,
        private resultAdded: (result: Fact) => Model,
        private resultRemoved: (model: Model) => void,
        private inner: Feed
    ) {
    }

    begin() {
        this.subscription = this.inner.from(this.start, this.query)
            .subscribe(reference => {
                this.onReceived([reference])
                    .catch(reason => {
                        this.onError(reason);
                    });
            });
        this.inner.query(this.start, this.query)
            .then(async results => {
                await this.onReceived(results);
            })
            .catch(reason => {
                this.onError(reason);
            });
    }

    private async onReceived(results: FactReference[]) {
        if (results.length !== 0) {
            const records = await this.inner.load(results);
            const facts = hydrateFromTree<Fact>(results, records);
            facts.forEach(fact => {
                this.resultAdded(fact);
            });
        }
    }

    private onError(reason: any) {

    }
}