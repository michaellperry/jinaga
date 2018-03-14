import { Query } from './interface';

export type QueryCache = { [descriptiveString: string]: {
    query: Query,
    result: Object[]
} };
