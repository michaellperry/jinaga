import Interface = require('./interface');
import Step = Interface.Step;
import Join = Interface.Join;
import Direction = Interface.Direction;
import PropertyCondition = Interface.PropertyCondition;
import ExistentialCondition = Interface.ExistentialCondition;
import Quantifier = Interface.Quantifier;
import isPredecessor = Interface.isPredecessor;
import computeHash = Interface.computeHash;
import buildPipeline = require('./mongoPipelineBuilder');

export class Point {
    constructor (
        public fact: Object,
        public hash: number) {} 
}

export type Processor = (start: Point, result: (error: string, facts: Array<Point>) => void) => void;

export function parseSteps(collection: any, steps: Array<Step>): Processor {
    if (steps[0] instanceof ExistentialCondition) {
        const condition = <ExistentialCondition>steps[0];
        const tail = steps.slice(1);
        const processor = existentialProcessor(
            parseSteps(collection, condition.steps),
            condition.quantifier);
        return parseTail(collection, processor, tail);
    }
    else if (steps[0] instanceof Join) {
        const join = <Join>steps[0];
        if (join.direction === Direction.Successor) {
            let index = 1;
            while (index < steps.length) {
                if (!(steps[index] instanceof PropertyCondition))
                    break;
                index++;
            }
            const head = steps.slice(0, index);
            const tail = steps.slice(index);
            const processor = pipelineProcessor(collection, head);
            return parseTail(collection, processor, tail);
        }
        else {
            const tail = steps.slice(1);
            return parseTail(collection, predecessorProcessor(join.role), tail);
        }
    }
    else if (steps[0] instanceof PropertyCondition) {
        const condition = <PropertyCondition>steps[0];
        const tail = steps.slice(1);
        return parseTail(collection, propertyConditionProcessor(condition.name, condition.value), tail);
    }
}

function predecessorProcessor(role: string): Processor {
    return function (start, result) {
        const value = start.fact[role];
        if (isPredecessor(value)) {
            result(null, [new Point(value, computeHash(value))]);
        }
        else if (Array.isArray(value) && value.every(v => isPredecessor(v))) {
            result(null, value.map(v => new Point(v, computeHash(v))));
        }
    };
}

function propertyConditionProcessor(name: string, value: any): Processor {
    return function (start, result) {
        if (start.fact.hasOwnProperty(name) && start.fact[name] === value) {
            result(null, [start]);
        }
        else {
            result(null, []);
        }
    };
}

function parseTail(collection: any, processor: Processor, tail: Array<Step>) {
    if (tail.length === 0)
        return processor;
    else
        return bind(processor, parseSteps(collection, tail));
}

function pipelineProcessor(collection: any, steps: Array<Step>): Processor {
    return function(start, result) {
        collection
            .aggregate(buildPipeline(start.hash, steps))
            .toArray((err, documents) => {
                result(
                    err ? err.message : null,
                    documents ? documents.map(d => new Point(d.fact, d.hash)) : null);
            });
    }
}

function existentialProcessor(
    condition: Processor,
    quantifier: Quantifier
): Processor {
    return function(start, result) {
        condition(start, function(error, facts) {
            if (error) {
                result(error, null);
            }
            else if (
                (facts.length === 0 && quantifier === Quantifier.Exists) ||
                (facts.length > 0   && quantifier === Quantifier.NotExists)) {
                result(null, []);
            }
            else {
                result(null, [start]);
            }
        });
    };
}

function bind(head: Processor, tail: Processor): Processor {
    return function(start, result) {
        head(start, (error, facts) => {
            if (error)
                result(error, null);
            else {
                let gather: Array<Point> = [];
                let count = facts.length;
                if (count === 0)
                    result(null, gather);
                else {
                    facts.forEach(point => {
                        tail(point, (subError, subFacts) => {
                            count--;
                            error = error || subError;
                            Array.prototype.push.apply(gather, subFacts);
                            if (count === 0) {
                                if (error)
                                    result(error, null);
                                else
                                    result(null, gather);
                            }
                        });
                    });
                }
            }
        });
    };
}
