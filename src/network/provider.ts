import { Coordinator } from '../coordinator/coordinator';
import { Query } from '../query/query';

export interface NetworkProvider {
    init(coordinator: Coordinator): void;
    watch(start: Object, query: Query, token: number): void;
    stopWatch(start: Object, query: Query): void;
    query(start: Object, query: Query, token: number): void;
    fact(fact: Object): void;
}
