import Interface = require('../interface');
import buildPipeline = require('./pipeline-builder');
import { Direction } from '../query/enums';
import { Join, PropertyCondition, Step } from '../query/steps';

export class Point {
    constructor (
        public fact: Object,
        public hash: number) {} 
}

export type Processor = (start: Point, result: (error: string, facts: Array<Point>) => void) => void;

export function executeIfMatches(start: Object, steps: Step[], done: (facts: Object[]) => void, execute: (start: Object, steps: Step[]) => void) {
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
        else if (head instanceof Join && head.direction === Direction.Predecessor && Interface.isPredecessor(start[head.role])) {
            executeIfMatches(start[head.role], steps.slice(1), done, execute);
        }
        else {
            execute(start, steps);
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