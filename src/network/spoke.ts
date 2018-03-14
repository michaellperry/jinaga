import { QueryCache } from '../query/cache';

export interface Spoke {
    gatherQueries(queries : QueryCache);
    distribute(queries: QueryCache, fact: Object);
}
