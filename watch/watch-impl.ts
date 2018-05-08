import { Authentication } from '../authentication';
import { hydrateFromTree } from '../fact/hydrate';
import { Watch } from '../jinaga';
import { Query } from '../query/query';
import { FactReference } from '../storage';

export class WatchImpl<Fact, Model> implements Watch {
    constructor(
        private start: FactReference,
        private query: Query,
        private resultAdded: (result: Fact) => Model,
        private resultRemoved: (model: Model) => void,
        private authentication: Authentication
    ) {
    }

    begin() {
        this.authentication.query(this.start, this.query)
            .then(async results => {
                if (results.length === 0) {
                    this.onResults([]);
                }
                else {
                    const records = await this.authentication.load(results);
                    const facts = hydrateFromTree<Fact>(results, records);
                    this.onResults(facts);
                }
            })
            .catch(reason => {
                this.onError(reason);
            });
    }

    private onResults(facts: Fact[]) {
        facts.forEach(fact => {
            this.resultAdded(fact);
        });
    }

    private onError(reason: any) {

    }
}