import { Inverse, invertQuery } from '../query/inverter';
import { Query } from '../query/query';
import { FactPath, FactRecord, FactReference, Storage } from '../storage';
import { mapAsync } from '../util/fn';
import { Feed, Handler, Observable, Subscription } from './feed';

type Listener = {
    inverse: Inverse,
    match: FactReference,
    added: Handler,
    removed: Handler
};

class SubscriptionImpl implements Subscription {
    private listeners: Listener[];

    constructor(
        private observable: ObservableImpl,
        added: Handler,
        removed: Handler
    ) {
        this.listeners = observable.inverses.map(inverse => {
            return {
                inverse: inverse,
                match: observable.start,
                added: added,
                removed: removed
            }
        });
    }

    add() {
        this.listeners.forEach(listener => {
            this.observable.addListener(listener);
        });
    }

    dispose() {
        this.listeners.forEach(listener => {
            this.observable.removeListener(listener);
        });
    }
}

class ObservableImpl implements Observable {
    constructor(
        public start: FactReference,
        public query: Query,
        public inverses: Inverse[],
        public results: Promise<FactPath[]>,
        public addListener: (subscription: Listener) => void,
        public removeListener: (subscription: Listener) => void) {}

    subscribe(added: Handler, removed: Handler): Subscription {
        const subscription = new SubscriptionImpl(this, added, removed);
        subscription.add();
        this.results
            .then(paths => added(paths))
            .catch(reason => this.onError(reason));
        return subscription;
    }

    private onError(reason: any) {
        throw new Error(reason);
    }
}

export class FeedImpl implements Feed {
    private listenersByTypeAndQuery: {
        [appliedToType: string]: {
            [queryKey: string]: Listener[]
        }
    };

    constructor(private inner: Storage) {
        this.listenersByTypeAndQuery = {};
    }

    async save(facts: FactRecord[]): Promise<FactRecord[]> {
        const saved = await this.inner.save(facts);
        await mapAsync(saved, async fact => {
            await this.notifyFactSaved(fact);
        });
        return saved;
    }
    
    query(start: FactReference, query: Query) {
        return this.inner.query(start, query);
    }

    load(references: FactReference[]) {
        return this.inner.load(references);
    }

    from(fact: FactReference, query: Query): Observable {
        const inverses = invertQuery(query);
        const observable = new ObservableImpl(fact, query, inverses,
            this.inner.query(fact, query),
            listener => { this.addListener(listener); },
            listener => { this.removeListener(listener); });
        return observable;
    }

    private addListener(listener: Listener) {
        let listenersByQuery = this.listenersByTypeAndQuery[listener.inverse.appliedToType];
        if (!listenersByQuery) {
            listenersByQuery = {};
            this.listenersByTypeAndQuery[listener.inverse.appliedToType] = listenersByQuery;
        }

        const queryKey = listener.inverse.affected.toDescriptiveString();
        let listeners = listenersByQuery[queryKey];
        if (!listeners) {
            listeners = [];
            listenersByQuery[queryKey] = listeners;
        }

        listeners.push(listener);
    }

    private removeListener(listener: Listener) {
        const listenersByQuery = this.listenersByTypeAndQuery[listener.inverse.appliedToType];
        if (listenersByQuery) {
            const queryKey = listener.inverse.affected.toDescriptiveString();
            const listeners = listenersByQuery[queryKey];
            if (listeners) {
                const index = listeners.indexOf(listener);
                if (index >= 0) {
                    listeners.splice(index, 1);
                }
            }
        }
    }

    private async notifyFactSaved(fact: FactRecord) {
        console.log('Fact saved: ' + fact.hash);
        const listenersByQuery = this.listenersByTypeAndQuery[fact.type];
        if (listenersByQuery) {
            for (const queryKey in listenersByQuery) {
                const listeners = listenersByQuery[queryKey];
                if (listeners && listeners.length > 0) {
                    const query = listeners[0].inverse.affected;
                    const affected = await this.inner.query(fact, query);
                    await mapAsync(listeners, async listener => {
                        const found = affected.find(path => {
                            const last = path[path.length - 1];
                            return last.hash === listener.match.hash && last.type === listener.match.type;
                        });
                        if (found) {
                            await this.notifyListener(found.slice().reverse(), listener);
                        }
                    });
                }
            }
        }
    }

    private async notifyListener(prefix: FactPath, listener: Listener) {
        const fact = prefix[prefix.length - 1];
        const affected = prefix[0];
        let description = 'Notify listener of ' + fact.hash + ', affecting: ' + affected.hash;
        if (listener.inverse.added) {
            description = description + ', adding: ' + listener.inverse.added.toDescriptiveString();
        }
        if (listener.inverse.removed) {
            description = description + ', removing: ' + listener.inverse.removed.toDescriptiveString();
        }
        console.log(description);
        if (listener.inverse.added && listener.added) {
            const added = await this.inner.query(fact, listener.inverse.added);
            if (added.length > 0) {
                const path = added.map(path => prefix.concat(path.slice(1)));
                console.log('Added ' + JSON.stringify(path));
                listener.added(path);
            }
        }
        if (listener.inverse.removed && listener.removed) {
            const removed = await this.inner.query(fact, listener.inverse.removed);
            if (removed.length > 0) {
                const path = removed.map(path => prefix.concat(path.slice(1)));
                console.log('Removed ' + JSON.stringify(path));
                listener.removed(path);
            }
        }
    }
}