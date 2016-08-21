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
        appendPredecessor(pipeline, startHash, join);
    }
    else {
        appendSuccessor(pipeline, startHash, join);
    }
}

function appendPredecessor(pipeline: Array<Object>, startHash: number, join: Join) {
    if (pipeline.length === 0) {
        pipeline.push({
            "$match": {
                hash: startHash
            }
        });
    }
    pipeline.push({
        "$unwind": "$predecessors"
    }, {
        "$match": {
            "predecessors.role": join.role
        }
    }, {
        "$lookup": {
            from: "successors",
            localField: "predecessors.hash",
            foreignField: "hash",
            as: "lookup_predecessors"
        }
    }, {
        "$unwind": "$lookup_predecessors"
    }, {
        "$project": {
            hash: "$lookup_predecessors.hash",
            predecessors: "$lookup_predecessors.predecessors",
            fact: "$lookup_predecessors.fact"
        }
    });
}

function appendSuccessor(pipeline: Array<Object>, startHash: number, join: Join) {
    if (pipeline.length === 0) {
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
    else {
        pipeline.push({
            "$lookup": {
                from: "successors",
                localField: "hash",
                foreignField: "predecessors.hash",
                as: "successors"
            }
        }, {
            "$unwind": {
                path: "$successors"
            }
        }, {
            "$match": {
                "successors.predecessors.role": join.role
            }
        }, {
            "$project": {
                hash: "$successors.hash",
                predecessors: "$successors.predecessors",
                fact: "$successors.fact"
            }
        });
    }
}

function appendPropertyCondition(pipeline: Array<Object>, propertyCondition: PropertyCondition) {
    if (pipeline.length > 0) {
        var match = {};
        match["fact." + propertyCondition.name] = propertyCondition.value;
        pipeline.push({
            "$match": match
        });
    }
}

export = buildPipeline;
