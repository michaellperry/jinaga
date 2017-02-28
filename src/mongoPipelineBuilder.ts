import Interface = require('./interface');
import Query = Interface.Query;
import Step = Interface.Step;
import Join = Interface.Join;
import Direction = Interface.Direction;
import PropertyCondition = Interface.PropertyCondition;

function buildPipeline(startHash: number, steps: Array<Step>): Object[] {
    if (steps.length === 0) {
        return [];
    }

    if (steps[0] instanceof Join) {
        const join = <Join>steps[0];
        if (join.direction === Direction.Predecessor) {
            return (<Object[]>[{
                "$match": {
                    hash: startHash
                }
            }, {
                "$unwind": "$predecessors"
            }, {
                "$match": {
                    "predecessors.role": join.role
                }
            }, {
                "$project": {
                    hash: "$predecessors.hash"
                }
            }]).concat(buildPipelineFromHashes(steps.slice(1)));
        }
        else {
            return (<Object[]>[{
                "$match": {
                    predecessors: {
                        "$elemMatch": {
                            role: join.role,
                            hash: startHash
                        }
                    }
                }
            }]).concat(buildPipelineFromFacts(steps.slice(1)));
        }
    }
    else {
        return buildPipeline(startHash, steps.slice(1));
    }
}

function buildPipelineFromHashes(steps: Step[]): Object[] {
    if (steps.length === 0) {
        return [{
            "$lookup": {
                from: "successors",
                localField: "hash",
                foreignField: "hash",
                as: "facts"
            }
        }, {
            "$unwind": "$facts"
        }, {
            "$project": {
                hash: "$facts.hash",
                predecessors: "$facts.predecessors",
                fact: "$facts.fact"
            }
        }];
    }
    else if (steps[0] instanceof Join) {
        const join = <Join>steps[0];
        if (join.direction === Direction.Predecessor) {
            return (<Object[]>[{
                "$lookup": {
                    from: "successors",
                    localField: "hash",
                    foreignField: "hash",
                    as: "facts"
                }
            }, {
                "$unwind": "$facts"
            }, {
                "$unwind": "$facts.predecessors"
            }, {
                "$match": {
                    "facts.predecessors.role": join.role
                }
            }, {
                "$project": {
                    hash: "$facts.predecessors.hash"
                }
            }]).concat(buildPipelineFromHashes(steps.slice(1)));
        }
        else {
            return (<Object[]>[{
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
            }]).concat(buildPipelineFromFacts(steps.slice(1)));
        }
    }
    else {
        return buildPipelineFromHashes(steps.slice(1));
    }
}

function buildPipelineFromFacts(steps: Step[]): Object[] {
    if (steps.length === 0) {
        return [];
    }

    if (steps[0] instanceof PropertyCondition) {
        const propertyCondition = <PropertyCondition>steps[0];
        var match = {};
        match["fact." + propertyCondition.name] = propertyCondition.value;
        return (<Object[]>[{
            "$match": match
        }]).concat(buildPipelineFromFacts(steps.slice(1)));
    }
    else if (steps[0] instanceof Join) {
        const join = <Join>steps[0];
        if (join.direction === Direction.Predecessor) {
            return (<Object[]>[{
                "$unwind": "$predecessors"
            }, {
                "$match": {
                    "predecessors.role": join.role
                }
            }, {
                "$project": {
                    hash: "$predecessors.hash"
                }
            }]).concat(buildPipelineFromHashes(steps.slice(1)));
        }
        else {
            return (<Object[]>[{
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
            }]).concat(buildPipelineFromFacts(steps.slice(1)));
        }
    }
    else {
        return buildPipelineFromFacts(steps.slice(1));
    }
}

export = buildPipeline;
