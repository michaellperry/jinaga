import { Coordinator } from '../coordinator/coordinator';
import { Query } from '../query/query';

export interface PersistenceProvider {
    init(coordinator: Coordinator): void;
    save(fact: Object, source: any): void;
    executePartialQuery(
        start: Object,
        query: Query,
        result: (error: string, facts: { [key: string]: any }[]) => void
    ): void;
}
