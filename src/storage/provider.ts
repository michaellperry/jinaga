import { Coordinator } from '../coordinator/coordinator';
import { Query } from '../query/query';

export interface StorageProvider {
    init(coordinator: Coordinator): void;
    save(fact: Object, source: any): void;
    executeQuery(
        start: Object,
        query: Query,
        readerFact: Object,
        result: (error: string, facts: Array<Object>) => void
    ): void;
    sendAllFacts(): void;
    push(fact: Object): void;
    dequeue(token: number, destination: any): void;
}
