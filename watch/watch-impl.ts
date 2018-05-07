import { Watch } from '../jinaga';
import { FactReference } from '../storage';
import { Query } from '../query/query';

export class WatchImpl<Fact, Model> implements Watch {
    constructor(
        public start: FactReference,
        public query: Query,
        public resultAdded: (result: Fact) => Model,
        public resultRemoved: (model: Model) => void
    ) {
    }

    public onResults(facts: Fact[]) {
        facts.forEach(fact => {
            this.resultAdded(fact);
        });
    }

    public onError(reason: any) {

    }
}