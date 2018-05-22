import { Hydration } from '../fact/hydrate';
import { Feed, Subscription } from '../feed/feed';
import { Query } from '../query/query';
import { Clause, parseQuery } from '../query/query-parser';
import { FactReference, factReferenceEquals, FactPath } from '../storage';
import { Watch } from './watch';
import { flattenAsync, mapAsync } from '../util/fn';

export class WatchImpl<Fact, Model> implements Watch<Fact, Model> {
    private subscription: Subscription;
    private modelByFactReference: { factReference: FactReference, model: Model }[] = [];

    constructor(
        private start: FactReference,
        private query: Query,
        private resultAdded: (path: FactPath, result: Fact) => Promise<Model>,
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
        const onResultAdded = async (path: FactPath, result: U) => {
            const factReference = path[path.length - 1];
            const origin = path[path.length - 2];
            const parent = this.modelByFactReference.find(pair =>
                pair.factReference.hash === origin.hash && pair.factReference.type === origin.type);
            return resultAdded(parent.model, result);
        }
        const watch = new WatchImpl<U, V>(this.start, fullQuery, onResultAdded, resultRemoved, this.inner);
        watch.begin();
        return watch;
    }

    private async onAdded(paths: FactPath[]) {
        if (paths.length !== 0) {
            const references = paths.map(path => path[path.length - 1]);
            const records = await this.inner.load(references);
            const hydration = new Hydration(records);
            await mapAsync(paths, async path => {
                const factReference = path[path.length - 1];
                const fact = <Fact>hydration.hydrate(factReference);
                const model = await this.resultAdded(path, fact);
                this.modelByFactReference.push({ factReference, model });
            });
        }
    }

    private onRemoved(paths: FactPath[]) {
        const removedIndex = this.modelByFactReference.findIndex(pair => {
            return paths.some(path => {
                const last = path[path.length - 1];
                return last.hash === pair.factReference.hash && last.type === pair.factReference.type;
            });
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