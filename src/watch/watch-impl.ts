import { Hydration } from '../fact/hydrate';
import { Feed, Subscription } from '../feed/feed';
import { Query } from '../query/query';
import { Preposition } from '../query/query-parser';
import { FactPath, FactReference, uniqueFactReferences } from '../storage';
import { ModelMap } from './model-map';
import { Watch } from './watch';
import { mapAsync } from '../util/fn';

interface WatchChild {
    load(): Promise<void>;
}

export class WatchImpl<Fact, Model> implements Watch<Fact, Model>, WatchChild {
    private subscription: Subscription;
    private modelMap = new ModelMap<Model>();
    private children: WatchChild[] = [];

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
        preposition: Preposition<Fact, U>,
        resultAdded: (parent: Model, result: U) => V,
        resultRemoved: (model: V) => void) : Watch<U, V>;
    watch<U, V>(
        preposition: Preposition<Fact, U>,
        resultAdded: (parent: Model, result: U) => void) : Watch<U, V>;
    watch<U, V>(
        preposition: Preposition<Fact, U>,
        resultAdded: (parent: Model, result: U) => (V | void),
        resultRemoved?: (model: V) => void
    ) : Watch<U, V> {
        const query = new Query(preposition.steps);
        const fullQuery = this.query.concat(query);
        const onResultAdded = (path: FactPath, fact: U, take: ((model: V) => void)) => {
            const prefix = path.slice(0, this.query.getPathLength());
            this.modelMap.withModel(prefix, (parent: Model) => {
                const model = resultAdded(parent, fact);
                take(resultRemoved ? <V>model : null);
            });
        }
        const watch = new WatchImpl<U, V>(this.start, fullQuery, onResultAdded, resultRemoved, this.inner);
        watch.begin();
        this.children.push(watch);
        return watch;
    }

    async load() {
        await this.subscription.load();
        await mapAsync(this.children, child => child.load());
    }

    stop() {
        this.subscription.dispose();
    }

    private async onAdded(paths: FactPath[]) {
        const references = paths.map(path => path[path.length - 1]);
        const uniqueReferences = uniqueFactReferences(references);
        const records = await this.inner.load(uniqueReferences);
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
                if (this.resultRemoved)
                    this.resultRemoved(model);
            }
        });
    }

    private onError(reason: any) {
        throw new Error(reason);
    }
}
