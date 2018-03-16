import { QueryCache } from '../query/cache';

export interface Spoke {
    gatherQueries(queries : QueryCache): void;
    distribute(queries: QueryCache, fact: Object): void;
}
