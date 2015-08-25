import Interface = require("./interface");
import Join = Interface.Join;

export class Inverse {
    constructor(
        public affected: Array<Join>,
        public added: Array<Join>,
        public removed: Array<Join>
    ) {
    }
}

export function invertQuery(joins: Array<Join>): Array<Inverse> {
    // This is never correct. All tests are failing.
    return [new Inverse([], [], [])];
}
