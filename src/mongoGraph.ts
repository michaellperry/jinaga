import Interface = require('./interface');
import Step = Interface.Step;
import ExistentialCondition = Interface.ExistentialCondition;
import Quantifier = Interface.Quantifier;
import buildPipeline = require('./mongoPipelineBuilder');

export class Point {
    constructor (
        public fact: Object,
        public hash: number) {} 
}

export type Processor = (start: Point, result: (error: string, facts: Array<Point>) => void) => void;

export function parseSteps(collection: any, steps: Array<Step>): Processor {
    if (steps[0] instanceof ExistentialCondition) {
        const head = <ExistentialCondition>steps[0];
        const tail = steps.slice(1);
        const processor = existentialProcessor(
            parseSteps(collection, head.steps),
            head.quantifier);
        return parseTail(collection, processor, tail);
    }
    else {
        let index = 0;
        while (index < steps.length) {
            if (steps[index] instanceof ExistentialCondition)
                break;
            index++;
        }
        const head = steps.slice(0, index);
        const tail = steps.slice(index);
        const processor = pipelineProcessor(collection, head);
        return parseTail(collection, processor, tail);
    }
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
