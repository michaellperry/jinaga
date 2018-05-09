import { Inverse, invertQuery } from '../query/inverter';
import { Query } from '../query/query';
import { FactRecord, FactReference, Storage, factReferenceEquals } from '../storage';
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
        public inverses: Inverse[],
        public addListener: (subscription: Listener) => void,
        public removeListener: (subscription: Listener) => void) {}

    subscribe(added: Handler, removed: Handler): Subscription {
        const subscription = new SubscriptionImpl(this, added, removed);
        subscription.add();
        return subscription;
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
        await Promise.all(saved.map(async fact => {
            await this.notifyFactSaved(fact);
        }));
        return saved;
    }
    
    query(start: FactReference, query: Query): Promise<FactReference[]> {
        return this.inner.query(start, query);
    }

    load(references: FactReference[]): Promise<FactRecord[]> {
        return this.inner.load(references);
    }

    from(fact: FactReference, query: Query): Observable {
        const inverses = invertQuery(query);
        return new ObservableImpl(fact, inverses,
            listener => { this.addListener(listener); },
            listener => { this.removeListener(listener); });
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
        const listenersByQuery = this.listenersByTypeAndQuery[fact.type];
        if (listenersByQuery) {
            for (const queryKey in listenersByQuery) {
                const listeners = listenersByQuery[queryKey];
                if (listeners && listeners.length > 0) {
                    const query = listeners[0].inverse.affected;
                    const affected = await this.inner.query(fact, query);
                    await Promise.all(listeners.map(async listener => {
                        if (affected.find(factReferenceEquals(listener.match))) {
                            await this.notifyListener(fact, listener);
                        }
                    }));
                }
            }
        }
    }

    private async notifyListener(fact: FactReference, listener: Listener) {
        if (listener.inverse.added && listener.added) {
            const added = await this.inner.query(fact, listener.inverse.added);
            added.forEach(listener.added);
        }
        if (listener.inverse.removed && listener.removed) {
            const removed = await this.inner.query(fact, listener.inverse.removed);
            removed.forEach(listener.removed);
        }
    }
}