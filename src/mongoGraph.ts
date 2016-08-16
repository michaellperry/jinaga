import Interface = require('./interface');
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

export type Cache = Array<{ start: Point, results: Array<Point> }>;

export function parseSteps(cache: Cache, collection: any, readerFact: Object, steps: Array<Step>): Processor {
    if (steps[0] instanceof ExistentialCondition) {
        const condition = <ExistentialCondition>steps[0];
        const tail = steps.slice(1);
        const processor = existentialProcessor(
            parseSteps(cache, collection, readerFact, condition.steps),
            condition.quantifier);
        return parseTail(cache, collection, readerFact, processor, tail);
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
            const processor = pipelineProcessor(cache, collection, readerFact, head);
            return parseTail(cache, collection, readerFact, processor, tail);
        }
        else {
            const tail = steps.slice(1);
            return parseTail(cache, collection, readerFact, predecessorProcessor(join.role), tail);
        }
    }
    else if (steps[0] instanceof PropertyCondition) {
        const condition = <PropertyCondition>steps[0];
        const tail = steps.slice(1);
        return parseTail(cache, collection, readerFact, propertyConditionProcessor(condition.name, condition.value), tail);
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

function parseTail(cache: Cache, collection: any, readerFact: Object, processor: Processor, tail: Array<Step>) {
    if (tail.length === 0)
        return processor;
    else
        return bind(processor, parseSteps(cache, collection, readerFact, tail));
}

function pipelineProcessor(cache: Cache, collection: any, readerFact: Object, steps: Array<Step>): Processor {
    return function(start, result) {
        // Check for cached start point.
        var cacheHits = cache.filter(cacheMatches(start));
        if (cacheHits.length > 0) {
            result(null, cacheHits[0].results);
        }
        else {
            // if (cache.length > 0) {
            //     console.log('Cache miss: ' + JSON.stringify(start) + '\n' + JSON.stringify(cache))
            // }
            collection
                .aggregate(buildPipeline(start.hash, steps))
                .toArray((err, documents) => {
                    var cacheHits = cache.filter(cacheMatches(start));
                    var results = documents
                        .map(d => new Point(d.fact, d.hash));
                    if (cacheHits.length > 0) {
                        cacheHits[0].results = results;
                    }
                    else {
                        cache.push({
                            start: start,
                            results: results
                        });
                        //console.log('Items in cache ' + cache.length);
                    }
                    result(
                        err ? err.message : null,
                        documents ? documents
                            .filter(d => authorizeRead(d.fact, readerFact))
                            .map(d => new Point(d.fact, d.hash)) : null);
                });
        }
    }
}

function cacheMatches(start: Point) : (c: {start: Point, results: Array<Point>}) => boolean {
    return function (c) {
        return c.start.hash === start.hash &&
            _isEqual(c.start.fact, start.fact);
    };
}

function authorizeRead(fact: Object, readerFact: Object) {
    if (!fact.hasOwnProperty("in")) {
        // Not in a locked fact
        return true;
    }
    var locked = fact["in"];
    if (!locked.hasOwnProperty("from")) {
        // Locked fact is not from a user, so no one has access
        return false;
    }
    var owner = locked["from"];
    if (_isEqual(owner, readerFact)) {
        // The owner has access.
        return true;
    }
    return false;
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
