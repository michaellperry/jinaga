import { Hydration } from '../fact/hydrate';
import { Feed, Subscription } from '../feed/feed';
import { Query } from '../query/query';
import { Preposition } from '../query/query-parser';
import { FactPath, FactReference } from '../storage';
import { ModelMap } from './model-map';
import { Watch } from './watch';

export class WatchImpl<Fact, Model> implements Watch<Fact, Model> {
    private subscription: Subscription;
    private modelMap = new ModelMap<Model>();

    constructor(
        private start: FactReference,
        private query: Query,
        private resultAdded: (path: FactPath, result: Fact, take: ((model: Model) => void)) => void,
        private resultRemoved: (model: Model) => void,
        private inner: Feed
    ) {}

    begin() {
        this.subscription = this.inner.from(this.start, this.query)
            .subscribe(paths => {
                this.onAdded(paths)
                    .catch(reason => {
                        this.onError(reason);
                    });
            }, reference => {
                this.onRemoved(reference);
            });
    }

    watch<U, V>(
        preposition: Preposition<U, V>,
        resultAdded: (parent: Model, result: U) => V,
        resultRemoved: (model: V) => void
    ) : Watch<U, V> {
        const query = new Query(preposition.steps);
        const fullQuery = this.query.concat(query);
        const onResultAdded = (path: FactPath, fact: U, take: ((model: V) => void)) => {
            const prefix = path.slice(0, this.query.getPathLength());
            this.modelMap.withModel(prefix, (parent: Model) => {
                const model = resultAdded(parent, fact);
                take(model)
            });
        }
        const watch = new WatchImpl<U, V>(this.start, fullQuery, onResultAdded, resultRemoved, this.inner);
        watch.begin();
        return watch;
    }

    private async onAdded(paths: FactPath[]) {
        const references = paths.map(path => path[path.length - 1]);
        const records = await this.inner.load(references);
        const hydration = new Hydration(records);
        paths.forEach(path => {
            if (!this.modelMap.hasModel(path)) {
                const factReference = path[path.length - 1];
                const fact = <Fact>hydration.hydrate(factReference);
                this.resultAdded(path, fact, (model: Model) => {
                    this.modelMap.setModel(path, model);
                });
            }
        });
    }

    private onRemoved(paths: FactPath[]) {
        paths.forEach(path => {
            if (this.modelMap.hasModel(path)) {
                const model = this.modelMap.removeModel(path);
                this.resultRemoved(model);
            }
        });
    }

    private onError(reason: any) {
        throw new Error(reason);
    }
}
