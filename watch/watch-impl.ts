import { Authentication } from '../authentication';
import { hydrateFromTree } from '../fact/hydrate';
import { Observable } from '../feed/feed';
import { Watch } from '../jinaga';
import { Query } from '../query/query';
import { FactReference } from '../storage';

export class WatchImpl<Fact, Model> implements Watch {
    private subscription: Observable;

    constructor(
        private start: FactReference,
        private query: Query,
        private resultAdded: (result: Fact) => Model,
        private resultRemoved: (model: Model) => void,
        private authentication: Authentication
    ) {
    }

    begin() {
        this.subscription = this.authentication.from(this.start, this.query)
            .subscribe(reference => {
                this.onReceived([reference])
                    .catch(reason => {
                        this.onError(reason);
                    });
            });
        this.authentication.query(this.start, this.query)
            .then(async results => {
                await this.onReceived(results);
            })
            .catch(reason => {
                this.onError(reason);
            });
    }

    private async onReceived(results: FactReference[]) {
        if (results.length !== 0) {
            const records = await this.authentication.load(results);
            const facts = hydrateFromTree<Fact>(results, records);
            facts.forEach(fact => {
                this.resultAdded(fact);
            });
        }
    }

    private onError(reason: any) {

    }
}