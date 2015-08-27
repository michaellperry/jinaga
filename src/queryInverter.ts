import Interface = require("./interface");
import Query = Interface.Query;
import SelfQuery = Interface.SelfQuery;
import JoinQuery = Interface.JoinQuery;
import Direction = Interface.Direction;
import Join = Interface.Join;

export class Inverse {
    constructor(
        public affected: Query,
        public added: Query,
        public removed: Query
    ) {
    }
}

export function invertQuery(query: Query): Array<Inverse> {
    return recursiveInvertQuery(query, SelfQuery.Identity, []);
}

function recursiveInvertQuery(head: Query, tail: Query, inverses: Array<Inverse>): Array<Inverse> {
    var joinQuery = <JoinQuery>head;
    if (joinQuery.head) {
        if (joinQuery.join.direction === Direction.Successor) {
            inverses = inverses.concat(new Inverse(
                joinQuery, tail, null
            ));
        }
        tail = tail.prepend(new Join(
            joinQuery.join.direction === Direction.Predecessor ?
                Direction.Successor : Direction.Predecessor,
            joinQuery.join.role
        ));
        head = joinQuery.head;
        inverses = recursiveInvertQuery(head, tail, inverses);
    }
    return inverses;
}
