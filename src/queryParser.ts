import Interface = require("./interface");
import Join = Interface.Join;
import PropertyCondition = Interface.PropertyCondition;
import Query = Interface.Query;
import Proxy = Interface.Proxy;
import Direction = Interface.Direction;
import Step = Interface.Step;
import _ = require("lodash");

class ParserProxy implements Proxy {
    constructor(
        private __parent: ParserProxy,
        private __role: string) {
    }

    has(name:string):Proxy {
        var proxy = new ParserProxy(this, name);
        this[name] = proxy;
        return proxy;
    }

    public createQuery(): Array<Step> {
        var currentSteps: Array<Step> = [];
        for (var name in this) {
            if (name[0] != "_" && typeof this[name] !== "function" && !(this[name] instanceof ParserProxy)) {
                var value = this[name];
                currentSteps.push(new PropertyCondition(name, value));
            }
        }
        if (this.__parent) {
            var steps = this.__parent.createQuery();
            var step: Step = new Join(Direction.Predecessor, this.__role);
            steps.push(step);
            return steps.concat(currentSteps);
        }
        else {
            return currentSteps;
        }
    }
}

function findTarget(spec:Object): Array<Step> {
    if (spec instanceof ParserProxy) {
        return (<ParserProxy>spec).createQuery();
    }
    if (spec instanceof Interface.ConditionalSpecification) {
        var conditional = <Interface.ConditionalSpecification>spec;
        var head = findTarget(spec.specification);
        var tail = parse(spec.conditions);
        if (tail.steps.length === 1 && tail.steps[0] instanceof Interface.ExistentialCondition) {
            return head.concat(tail.steps);
        }
        else {
            return head.concat(new Interface.ExistentialCondition(Interface.Quantifier.Exists, tail.steps));
        }
    }
    if (spec instanceof Interface.InverseSpecification) {
        var inverse = <Interface.InverseSpecification>spec;
        var steps = findTarget(spec.specification);
        return [new Interface.ExistentialCondition(Interface.Quantifier.NotExists, steps)];
    }
    if (spec instanceof Object) {
        var steps: Array<Step> = [];
        var targetQuery: Array<Step> = null;
        for (var field in spec) {
            if (!targetQuery) {
                var targetQuery = findTarget(spec[field]);
                if (targetQuery) {
                    var join = new Join(Direction.Successor, field);
                    targetQuery.push(join);
                }
            }
            if (typeof spec[field] === "string"||
                typeof spec[field] === "number"||
                typeof spec[field] === "boolean") {
                var step = new PropertyCondition(field, spec[field]);
                steps.push(step);
            }
        }

        if (targetQuery) {
            targetQuery = targetQuery.concat(steps);
        }
        return targetQuery;
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
