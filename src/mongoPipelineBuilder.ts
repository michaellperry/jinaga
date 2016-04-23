import Interface = require('./interface');
import Query = Interface.Query;
import Step = Interface.Step;
import Join = Interface.Join;
import Direction = Interface.Direction;

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
}

function appendJoin(pipeline: Array<Object>, startHash: number, join: Join) {
    if (join.direction === Direction.Successor) {
        appendSuccessor(pipeline, startHash, join);
    }
}

function appendSuccessor(pipeline: Array<Object>, startHash: number, join: Join) {
    if (pipeline.length === 0) {
        pipeline.push({
            "$match": {
                hash: startHash,
                role: join.role
            }
        });
    }
    else {
        pipeline.push({
            "$lookup": {
                from: "successors",
                localField: "successorHash",
                foreignField: "hash",
                as: "successors"
            }
        }, {
            "$unwind": {
                path: "$successors"
            }
        }, {
            "$project": {
                hash: "$successors.hash",
                role: "$successors.role",
                successorHash: "$successors.successorHash",
                successor: "$successors.successor"
            }
        }, {
            "$match": {
                role: join.role
            }
        });
    }
}

export = buildPipeline;
