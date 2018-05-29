import { Hydration } from '../fact/hydrate';
import { Feed, Subscription } from '../feed/feed';
import { Query } from '../query/query';
import { Clause, parseQuery } from '../query/query-parser';
import { FactReference, factReferenceEquals, FactPath } from '../storage';
import { Watch } from './watch';
import { flattenAsync, mapAsync } from '../util/fn';

export class WatchImpl<Fact, Model> implements Watch<Fact, Model> {
    private subscription: Subscription;
    private modelOrActionByFactPath: { factPath: FactPath, modelOrAction: (Model | ((model: Model) => void)) }[] = [];

    constructor(
        private start: FactReference,
        private query: Query,
        private resultAdded: (path: FactPath, result: Fact, take: ((model: Model) => void)) => void,
        private resultRemoved: (model: Model) => void,
        private inner: Feed
    ) {
    }

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
        clause: Clause<Fact, U>,
        resultAdded: (parent: Model, fact: U) => V,
        resultRemoved: (model: V) => void
    ) : Watch<U, V> {
        const query = parseQuery(clause);
        const fullQuery = this.query.concat(query);
        const onResultAdded = (path: FactPath, fact: U, take: ((model: V) => void)) => {
            const prefix = path.slice(0, this.query.getPathLength());
            this.withModel(prefix, (parent: Model) => {
                const model = resultAdded(parent, fact);
                take(model)
            });
        }
        const watch = new WatchImpl<U, V>(this.start, fullQuery, onResultAdded, resultRemoved, this.inner);
        watch.begin();
        return watch;
    }

    private withModel(path: FactPath, action: (model: Model) => void) {
        const pair = this.modelOrActionByFactPath.find(factPathMatches(path));
        if (!pair) {
            this.modelOrActionByFactPath.push({ factPath: path, modelOrAction: action });
        }
        else {
            const prior = pair.modelOrAction;
            if (typeof(prior) === 'function') {
                pair.modelOrAction = (model: Model) => {
                    prior(model);
                    action(model);
                }
            }
            else {
                action(prior);
            }
        }
    }

    private setModel(path: FactPath, model: Model) {
        const pair = this.modelOrActionByFactPath.find(factPathMatches(path));
        if (!pair) {
            this.modelOrActionByFactPath.push({ factPath: path, modelOrAction: model });
        }
        else {
            const prior = pair.modelOrAction;
            if (typeof(prior) === 'function') {
                pair.modelOrAction = model;
                prior(model);
            }
            else {
                throw new Error('Setting the model twice on path ' + JSON.stringify(path));
            }
        }
    }

    private hasModel(path: FactPath) {
        const pair = this.modelOrActionByFactPath.find(factPathMatches(path));
        return pair && typeof(pair.modelOrAction) !== 'function';
    }

    private async onAdded(paths: FactPath[]) {
        const references = paths.map(path => path[path.length - 1]);
        const records = await this.inner.load(references);
        const hydration = new Hydration(records);
        paths.forEach(path => {
            if (!this.hasModel(path)) {
                const factReference = path[path.length - 1];
                const fact = <Fact>hydration.hydrate(factReference);
                this.resultAdded(path, fact, (model: Model) => {
                    this.setModel(path, model);
                });
            }
        });
    }

    private onRemoved(paths: FactPath[]) {
        paths.forEach(path => {
            const removedIndex = this.modelOrActionByFactPath.findIndex(factPathMatches(path));
            if (removedIndex >= 0) {
                const prior = this.modelOrActionByFactPath[removedIndex].modelOrAction;
                if (typeof(prior) === 'object') {
                    this.resultRemoved(prior);
                }
                else {
                    throw new Error('Removed a fact before it was added?');
                }
                this.modelOrActionByFactPath.splice(removedIndex, 1);
            }
        });
    }

    private onError(reason: any) {
        throw new Error(reason);
    }
}


function factPathMatches(path: FactPath): (pair: { factPath: FactPath }) => boolean {
    return pair => {
        if (pair.factPath.length === path.length) {
            for (let i = 0; i < pair.factPath.length; i++) {
                if (pair.factPath[i].hash !== path[i].hash ||
                    pair.factPath[i].type !== path[i].type) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }
}
