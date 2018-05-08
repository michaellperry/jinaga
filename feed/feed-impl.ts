import { Inverse, invertQuery } from '../query/inverter';
import { Query } from '../query/query';
import { FactRecord, FactReference, Storage } from '../storage';
import { Feed, Observable, Subscription } from './feed';

type Handler = (fact: FactReference) => void;

class SubscriptionImpl implements Subscription {
    constructor(
        public observable: ObservableImpl,
        public handler: Handler) {}

    dispose(): void {
        this.observable.removeSubscription(this);
    }
}

class ObservableImpl implements Observable {
    constructor(
        public start: FactReference,
        public query: Query,
        public inverses: Inverse[],
        public addSubscription: (subscription: SubscriptionImpl) => void,
        public removeSubscription: (subscription: SubscriptionImpl) => void) {}

    subscribe(handler: Handler): Subscription {
        const subscription = new SubscriptionImpl(this, handler);
        this.addSubscription(subscription);
        return subscription;
    }
}

export class FeedImpl implements Feed {
    private subscriptions: SubscriptionImpl[];

    constructor(private inner: Storage) {

    }

    async save(facts: FactRecord[]): Promise<FactRecord[]> {
        const saved = await this.inner.save(facts);
        if (saved) {
            facts.forEach(fact => {
                this.subscriptions.forEach(subscription => {
                    subscription.observable.inverses.forEach(inverse => {
                        const affectedReferences = this.inner.query(fact, inverse.affected);
                    });
                });
            });
        }
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
        return new ObservableImpl(fact, query, inverses,
            s => { this.subscriptions.push(s); },
            s => {
                const index = this.subscriptions.indexOf(s);
                if (index >= 0) {
                    this.subscriptions.splice(index, 1);
                }
            });
    }
}