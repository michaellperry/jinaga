import Interface = require('./interface');
import Query = Interface.Query;
import Step = Interface.Step;
import Join = Interface.Join;
import Direction = Interface.Direction;
import PropertyCondition = Interface.PropertyCondition;
import ExistentialCondition = Interface.ExistentialCondition;
import Quantifier = Interface.Quantifier;
import isPredecessor = Interface.isPredecessor;
import computeHash = Interface.computeHash;
import Collections = require('./collections');
import _isEqual = Collections._isEqual;
import buildPipeline = require('./mongoPipelineBuilder');

export class Point {
    constructor (
        public fact: Object,
        public hash: number) {} 
}

export type Processor = (start: Point, result: (error: string, facts: Array<Point>) => void) => void;

export function executeIfMatches(start: Object, steps: Step[], done: (facts: Object[]) => void, execute: (steps: Step[]) => void) {
    if (steps.length === 0) {
        done([start]);
    }
    else {
        let head = steps[0];
        if (head instanceof PropertyCondition) {
            if (start[head.name] === head.value) {
                executeIfMatches(start, steps.slice(1), done, execute);
            }
            else {
                done([]);
            }
        }
        else {
            execute(steps);
        }
    }
}

export function pipelineProcessor(collection: any, steps: Step[]): Processor {
    return function(start, result) {
        const pipeline = buildPipeline(start.hash, steps);
        collection
            .aggregate(pipeline)
            .toArray((err, documents) => {
                result(
                    err ? err.message : null,
                    documents ? documents
                        .map(d => new Point(d.fact, d.hash)) : null);
            });
    }
}