import Interface = require("./interface");
import Query = Interface.Query;

export class Inverse {
    constructor(
        public affected: Query,
        public added: Query,
        public removed: Query
    ) {
    }
}

export function invertQuery(query: Query): Array<Inverse> {
    throw Error("Not implemented");
}
