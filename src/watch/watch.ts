import { Preposition } from '../query/query-parser';

export interface Watch<Fact, Model> {
    watch<U, V>(
        preposition: Preposition<U, V>,
        resultAdded: (parent: Model, result: U) => V,
        resultRemoved: (model: V) => void) : Watch<U, V>;
}