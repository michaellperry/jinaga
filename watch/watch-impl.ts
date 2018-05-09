import { hydrateFromTree, Hydration } from '../fact/hydrate';
import { Feed, Observable, Subscription } from '../feed/feed';
import { Query } from '../query/query';
import { FactReference, factReferenceEquals } from '../storage';
import { Watch } from './watch';

export class WatchImpl<Fact, Model> implements Watch {
    private subscription: Subscription;
    private modelByFactReference: { factReference: FactReference, model: Model }[] = [];

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
                this.onAdded(reference)
                    .catch(reason => {
                        this.onError(reason);
                    });
            }, reference => {
                this.onRemoved(reference);
            });
    }

    private async onAdded(references: FactReference[]) {
        if (references.length !== 0) {
            const records = await this.inner.load(references);
            const hydration = new Hydration(records);
            references.forEach(factReference => {
                const fact = <Fact>hydration.hydrate(factReference);
                const model = this.resultAdded(fact);
                this.modelByFactReference.push({ factReference, model });
            });
        }
    }

    private onRemoved(references: FactReference[]) {
        const removedIndex = this.modelByFactReference.findIndex(pair => {
            return !!references.find(factReferenceEquals(pair.factReference));
        });
        if (removedIndex >= 0) {
            this.resultRemoved(this.modelByFactReference[removedIndex].model);
            this.modelByFactReference.splice(removedIndex, 1);
        }
    }

    private onError(reason: any) {

    }
}