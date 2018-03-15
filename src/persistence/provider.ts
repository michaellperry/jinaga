import { Coordinator } from '../coordinator/coordinator';
import { Query } from '../query/query';

export interface PersistenceProvider {
    init(coordinator: Coordinator);
    save(fact: Object, source: any);
    executePartialQuery(
        start: Object,
        query: Query,
        result: (error: string, facts: Array<Object>) => void
    );
}
