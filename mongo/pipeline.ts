import { Direction, Join, Step, PropertyCondition, ExistentialCondition, Quantifier } from '../query/steps';
import { FactReference } from '../storage';
import { Document } from './connection';

export function pipelineFromSteps(start: FactReference, steps: Step[]) {
    if (steps.length >= 1) {
        const firstStep = steps[0];
        if (firstStep instanceof Join) {
            if (firstStep.direction === Direction.Successor) {
                return pipelineFromSuccessor(start, firstStep.role, steps.slice(1));
            }
        }
    }

    throw new Error("Cannot yet handle this query.");
}

function pipelineFromSuccessor(start: FactReference, role: string, steps: Step[]) {
    let match: Document = {};
    match["predecessors." + role + ".hash"] = start.hash;
    match["predecessors." + role + ".type"] = start.type;
    return pipelineFromMatch(match, steps);
}

function pipelineFromMatch(match: Document, steps: Step[]): Document[] {
    if (steps.length === 0) {
        return [{
            "$match": match
        }];
    }
    else {
        const nextStep = steps[0];
        if (nextStep instanceof PropertyCondition && nextStep.name === "type") {
            match["type"] = nextStep.value;
            return pipelineFromMatch(match, steps.slice(1));
        }
        else if (nextStep instanceof ExistentialCondition) {
            return pipelineWithCondition([{
                "$match": match
            }], nextStep, steps.slice(1));
        }
    }

    throw new Error("Cannot yet handle this query.");
}

function pipelineWithCondition(head: Document[], condition: ExistentialCondition, steps: Step[]): Document[] {
    const pipeline = pipelineFromInputAndSteps(condition.steps);
    const lookup = {
        "$lookup": {
            "from": "facts",
            "let": {
                "hash": "$hash",
                "type": "$type"
            },
            "pipeline": pipeline,
            "as": "successors"
        }
    };
    const match = {
        "$match": {
            "successors.hash": { "$exists": condition.quantifier === Quantifier.Exists }
        }
    };
    const project = {
        "$project": {
            "successors": false
        }
    };

    return pipelineTail(head.concat(lookup, match, project), steps);
}

function pipelineFromInputAndSteps(steps: Step[]): Document[] {
    if (steps.length >= 0) {
        const nextStep = steps[0];
        if (nextStep instanceof Join) {
            if (nextStep.direction === Direction.Successor) {
                const unwind = {
                    "$unwind": "$predecessors." + nextStep.role
                };
                let conditions = [
                    { "$eq": [ "$predecessors." + nextStep.role + ".hash", "$$hash"] },
                    { "$eq": [ "$predecessors." + nextStep.role + ".type", "$$type"] }
                ];
                return pipelineFromInputMatchAndSteps(unwind, conditions, steps.slice(1));
            }
        }
    }

    throw new Error("Cannot yet handle this query.");
}

function pipelineFromInputMatchAndSteps(unwind: Document, conditions: Document[], steps: Step[]): Document[] {
    if (steps.length >= 0) {
        const nextStep = steps[0];
        if (nextStep instanceof PropertyCondition && nextStep.name === "type") {
            const type = { "$eq": [ "$type", nextStep.value] };
            return pipelineFromInputMatchAndSteps(unwind, conditions.concat(type), steps.slice(1));
        }
    }

    const match = {
        "$match": {
            "$expr": {
                "$and": conditions
            }
        }
    };
    const limit = {
        "$limit": 1
    };
    return pipelineTail([unwind, match, limit], steps);
}

function pipelineTail(head: Document[], steps: Step[]): Document[] {
    if (steps.length === 0) {
        return head;
    }

    throw new Error("Cannot yet handle this query.");
}