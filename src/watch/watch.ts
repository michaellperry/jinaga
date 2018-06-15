import { Clause, Specification } from '../query/query-parser';

export interface Watch<Fact, Model> {
    watch<U, V>(
        specification: (target : Fact) => Specification<U>,
        resultAdded: (parent: Model, result: U) => V,
        resultRemoved: (model: V) => void) : Watch<U, V>;
    watch1<U, V>(
        clause: Clause<Fact, U>,
        resultAdded: (parent: Model, result: U) => V,
        resultRemoved: (model: V) => void) : Watch<U, V>;
}