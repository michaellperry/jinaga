import { Coordinator } from '../coordinator';
import { Query } from '../query/query';

export interface NetworkProvider {
    init(coordinator: Coordinator);
    watch(start: Object, query: Query, token: number);
    stopWatch(start: Object, query: Query);
    query(start: Object, query: Query, token: number);
    fact(fact: Object);
}
