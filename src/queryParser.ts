import Interface = require("./interface");
import Join = Interface.Join;
import Query = Interface.Query;
import Proxy = Interface.Proxy;
import Direction = Interface.Direction;
import Step = Interface.Step;

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

    public createQuery(): Array<Step> {
        if (this.parent) {
            var steps = this.parent.createQuery();
            var step: Step = new Join(Direction.Predecessor, this.role);
            steps.push(step);
            return steps;
        }
        else {
            return [];
        }
    }
}

function findTarget(spec:Object): Array<Step> {
    if (spec instanceof ParserProxy) {
        return (<ParserProxy>spec).createQuery();
    }
    for (var field in spec) {
        var targetQuery = findTarget(spec[field]);
        if (targetQuery) {
            var step = new Join(Direction.Successor, field);
            targetQuery.push(step);
            return targetQuery;
        }
    }
    return null;
}

function parse(templates: Array<(target: Proxy) => Object>): Query {
    for (var templateIndex in templates) {
        var template = templates[templateIndex];
        var target = new ParserProxy(null, null);
        var spec = template(target);
        var targetJoins = findTarget(spec);
        return new Query(targetJoins); // TODO: Append each query
    }
    return null;
}

export = parse;
