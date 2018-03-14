import { Coordinator } from '../coordinator';
import { Query } from '../query/query';

export interface StorageProvider {
    init(coordinator: Coordinator);
    save(fact: Object, source: any);
    executeQuery(
        start: Object,
        query: Query,
        readerFact: Object,
        result: (error: string, facts: Array<Object>) => void
    );
    sendAllFacts();
    push(fact: Object);
    dequeue(token: number, destination: any);
}
