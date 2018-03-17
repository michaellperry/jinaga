import { JinagaCoordinator } from './jinaga-coordinator';
import { Subscription } from './subscription';

export class SubscriptionProxy {
    constructor(
        private coordinator: JinagaCoordinator,
        private subscription: Subscription
    ) {
    }

    stop() {
        if (this.subscription) {
            this.coordinator.stopSubscription(this.subscription);
        }
    }
}