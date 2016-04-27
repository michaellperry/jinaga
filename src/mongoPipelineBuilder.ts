import Interface = require('./interface');
import Query = Interface.Query;
import Step = Interface.Step;
import Join = Interface.Join;
import Direction = Interface.Direction;
import PropertyCondition = Interface.PropertyCondition;

function buildPipeline(startHash: number, steps: Array<Step>) {
    var pipeline = [];
    steps.forEach(step => {
        appendStep(pipeline, startHash, step);
    });
    return pipeline;
}

function appendStep(pipeline: Array<Object>, startHash: number, step: Step) {
    if (step instanceof Join) {
        appendJoin(pipeline, startHash, <Join>step);
    }
    else if (step instanceof PropertyCondition) {
        appendPropertyCondition(pipeline, <PropertyCondition>step);
    }
}

function appendJoin(pipeline: Array<Object>, startHash: number, join: Join) {
    if (join.direction === Direction.Predecessor) {
        throw new Error("Do predecessors in memory.");
    }
    else {
        appendSuccessor(pipeline, startHash, join);
    }
}

function appendSuccessor(pipeline: Array<Object>, startHash: number, join: Join) {
    pipeline.push({
        "$match": {
            predecessors: {
                "$elemMatch": {
                    role: join.role,
                    hash: startHash
                }
            }
        }
    });
}

function appendPropertyCondition(pipeline: Array<Object>, propertyCondition: PropertyCondition) {
    var match = {};
    match["fact." + propertyCondition.name] = propertyCondition.value;
    pipeline.push({
        "$match": match
    });
}

export = buildPipeline;
