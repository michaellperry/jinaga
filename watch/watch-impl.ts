import { Hydration } from '../fact/hydrate';
import { Feed, Subscription } from '../feed/feed';
import { Query } from '../query/query';
import { Clause, parseQuery } from '../query/query-parser';
import { FactReference, factReferenceEquals } from '../storage';
import { Watch } from './watch';
import { completeInvertQuery } from '../query/inverter';
import { flattenAsync, mapAsync } from '../util/fn';

export class WatchImpl<Fact, Model> implements Watch<Fact, Model> {
    private subscription: Subscription;
    private modelByFactReference: { factReference: FactReference, model: Model }[] = [];

    constructor(
        private start: FactReference,
        private query: Query,
        private resultAdded: (factReference: FactReference, result: Fact) => Promise<Model>,
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
    
    watch<U, V>(
        clause: Clause<Fact, U>,
        resultAdded: (parent: Model, result: U) => V,
        resultRemoved: (model: V) => void
    ) : Watch<U, V> {
        const query = parseQuery(clause);
        const fullQuery = this.query.concat(query);
        const backtrack = completeInvertQuery(query);
        const onResultAdded = async (factReference: FactReference, result: U) => {
            const origin = await this.inner.query(factReference, backtrack);
            const parent = this.modelByFactReference.find(pair => {
                return origin.some(factReferenceEquals(pair.factReference));
            });
            return resultAdded(parent.model, result);
        }
        const watch = new WatchImpl<U, V>(this.start, fullQuery, onResultAdded, resultRemoved, this.inner);
        watch.begin();
        return watch;
    }

    private async onAdded(references: FactReference[]) {
        if (references.length !== 0) {
            const records = await this.inner.load(references);
            const hydration = new Hydration(records);
            await mapAsync(references, async factReference => {
                const fact = <Fact>hydration.hydrate(factReference);
                const model = await this.resultAdded(factReference, fact);
                this.modelByFactReference.push({ factReference, model });
            });
        }
    }

    private onRemoved(references: FactReference[]) {
        const removedIndex = this.modelByFactReference.findIndex(pair => {
            return references.some(factReferenceEquals(pair.factReference));
        });
        if (removedIndex >= 0) {
            this.resultRemoved(this.modelByFactReference[removedIndex].model);
            this.modelByFactReference.splice(removedIndex, 1);
        }
    }

    private onError(reason: any) {
        throw new Error(reason);
    }
}