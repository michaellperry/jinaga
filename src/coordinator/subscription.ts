import { Query } from '../query/query';

export class Subscription {
    constructor(
        public start: Object,
        public joins: Query
    ) {
    }
}