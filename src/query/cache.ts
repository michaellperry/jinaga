import { Query } from './query';

export type QueryCache = { [descriptiveString: string]: {
    query: Query,
    result: Object[]
} };
