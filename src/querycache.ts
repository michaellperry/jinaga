import { Query } from './query/query';

export type QueryCache = { [descriptiveString: string]: {
    query: Query,
    result: Object[]
} };
