import Interface = require("./interface");
import Join = Interface.Join;
import Direction = Interface.Direction;
import Proxy = Interface.Proxy;

class ParserProxy implements Proxy {
    __isParserProxy: boolean = true;

    constructor(
        public joins: Array<Join>) {
    }

    has(name:string):Proxy {
        var proxy = new ParserProxy(this.joins.concat(new Join(Direction.Predecessor, name, [])));
        this[name] = proxy;
        return proxy;
    }
}

function findTarget(spec:Object): Array<Join> {
    if (spec["__isParserProxy"]) {
        return (<ParserProxy>spec).joins;
    }
    for (var field in spec) {
        var targetJoins = findTarget(spec[field]);
        if (targetJoins)
            return targetJoins.concat(new Join(Direction.Successor, field, []));
    }
    return null;
}

function parse(templates: Array<(target: Proxy) => Object>): Array<Join> {
    var joins: Array<Join> = [];

    for (var templateIndex in templates) {
        var template = templates[templateIndex];
        var target = new ParserProxy([]);
        var spec = template(target);
        var targetJoins = findTarget(spec);
        joins = joins.concat(targetJoins);
    }
    return joins;
}

export = parse;
