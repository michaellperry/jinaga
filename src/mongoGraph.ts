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