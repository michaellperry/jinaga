import Interface = require("../interface");
import InverseSpecification = Interface.InverseSpecification;
import { Proxy, ConditionalSpecification } from '../conditional';
import { Query } from './query';
import { Step, Join, PropertyCondition, ExistentialCondition } from './steps';
import { Direction, Quantifier} from './enums';

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
    if (spec instanceof ConditionalSpecification) {
        var conditional = <ConditionalSpecification>spec;
        var head = findTarget(spec.specification);
        var tail = parse(spec.conditions);
        if (tail.steps.length === 1 && tail.steps[0] instanceof ExistentialCondition) {
            return head.concat(tail.steps);
        }
        else {
            return head.concat(<Step>new ExistentialCondition(Quantifier.Exists, tail.steps));
        }
    }
    if (spec instanceof InverseSpecification) {
        var inverse = <InverseSpecification>spec;
        var steps = findTarget(spec.specification);
        if (steps.length === 1 && steps[0] instanceof ExistentialCondition) {
            var inner = <ExistentialCondition>steps[0];
            return [new ExistentialCondition(
                inner.quantifier === Quantifier.Exists ? Quantifier.NotExists : Quantifier.Exists,
                inner.steps
            )]
        }
        else {
            return [new ExistentialCondition(Quantifier.NotExists, steps)];
        }
    }
    if (Array.isArray(spec) && spec.length === 1) {
        return findTarget(spec[0]);
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
    var steps: Array<Step> = [];
    for (var templateIndex in templates) {
        var template = templates[templateIndex];
        var target = new ParserProxy(null, null);
        var spec = template(target);
        var targetJoins = findTarget(spec);
        steps = steps.concat(targetJoins);
    }
    return new Query(steps);
}

export = parse;
