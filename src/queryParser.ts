import Interface = require("./interface");
import Join = Interface.Join;
import Query = Interface.Query;
import JoinQuery = Interface.JoinQuery;
import SelfQuery = Interface.SelfQuery;
import Direction = Interface.Direction;
import Proxy = Interface.Proxy;

class ParserProxy implements Proxy {
    constructor(
        public parent: ParserProxy,
        public role: string) {
    }

    has(name:string):Proxy {
        var proxy = new ParserProxy(this, name);
        this[name] = proxy;
        return proxy;
    }

    public createQuery(tail: Query): Query {
        if (this.parent) {
            return this.parent.createQuery(new JoinQuery(
                [],
                new Join(Direction.Predecessor, this.role),
                tail
            ));
        }
        else {
            return tail;
        }
    }
}

function findTarget(spec:Object, tail: Query): Query {
    if (spec instanceof ParserProxy) {
        return (<ParserProxy>spec).createQuery(tail);
    }
    for (var field in spec) {
        var query: Query = new JoinQuery([], new Join(Direction.Successor, field), tail);
        var targetQuery = findTarget(spec[field], query);
        if (targetQuery)
            return targetQuery;
    }
    return null;
}

function parse(templates: Array<(target: Proxy) => Object>): Query {
    for (var templateIndex in templates) {
        var template = templates[templateIndex];
        var target = new ParserProxy(null, null);
        var spec = template(target);
        var targetJoins = findTarget(spec, new SelfQuery([]));
        return targetJoins; // TODO: Append each query
    }
    return null;
}

export = parse;
