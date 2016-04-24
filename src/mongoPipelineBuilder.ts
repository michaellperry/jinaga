import Interface = require('./interface');
import Query = Interface.Query;
import Step = Interface.Step;
import Join = Interface.Join;
import Direction = Interface.Direction;
import PropertyCondition = Interface.PropertyCondition;

function buildPipeline(startHash: number, query: Query) {
    var pipeline = [];
    query.steps.forEach(step => {
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
                successorHash: startHash,
                role: join.role
            }
        }, {
            "$project": {
                hash: "$predecessorHash",
                fact: "$predecessor"
            }
        });
    }
    else {
        pipeline.push({
            "$lookup": {
                from: "successors",
                localField: "hash",
                foreignField: "successorHash",
                as: "predecessors"
            }
        }, {
            "$unwind": {
                path: "$predecessors"
            }
        }, {
            "$match": {
                "predecessors.role": join.role
            }
        }, {
            "$project": {
                hash: "$predecessors.predecessorHash",
                fact: "$predecessors.predecessor"
            }
        });
    }
}

function appendSuccessor(pipeline: Array<Object>, startHash: number, join: Join) {
    if (pipeline.length === 0) {
        pipeline.push({
            "$match": {
                predecessorHash: startHash,
                role: join.role
            }
        }, {
            "$project": {
                hash: "$successorHash",
                fact: "$successor"
            }
        });
    }
    else {
        pipeline.push({
            "$lookup": {
                from: "successors",
                localField: "hash",
                foreignField: "predecessorHash",
                as: "successors"
            }
        }, {
            "$unwind": {
                path: "$successors"
            }
        }, {
            "$match": {
                "successors.role": join.role
            }
        }, {
            "$project": {
                hash: "$successors.successorHash",
                fact: "$successors.successor"
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
