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

    public createQuery() {
        if (this.parent) {
            return new JoinQuery(
                this.parent.createQuery(),
                new Join(Direction.Predecessor, this.role),
                []
            );
        }
        else {
            return new SelfQuery([]);
        }
    }
}

function findTarget(spec:Object): Query {
    if (spec instanceof ParserProxy) {
        return (<ParserProxy>spec).createQuery();
    }
    for (var field in spec) {
        var targetQuery = findTarget(spec[field]);
        if (targetQuery)
            return new JoinQuery(targetQuery, new Join(Direction.Successor, field), []);
    }
    return null;
}

function parse(templates: Array<(target: Proxy) => Object>): Query {
    for (var templateIndex in templates) {
        var template = templates[templateIndex];
        var target = new ParserProxy(null, null);
        var spec = template(target);
        var targetJoins = findTarget(spec);
        return targetJoins; // TODO: Append each query
    }
    return null;
}

export = parse;
