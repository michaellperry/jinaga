import Interface = require("./interface");
import Query = Interface.Query;
import Direction = Interface.Direction;
import Join = Interface.Join;
import PropertyCondition = Interface.PropertyCondition;
import Step = Interface.Step;
import ExistentialCondition = Interface.ExistentialCondition;
import Quantifier = Interface.Quantifier;

export class Inverse {
    constructor(
        public affected: Query,
        public added: Query,
        public removed: Query
    ) {
    }
}

function optimize(steps: Array<Step>) : Array<Step> {
    if (steps.length > 0) {
        // Since a new fact does not yet have successors, an existential condition is always
        // true (if not exists) or false (if exists).
        if (steps[0] instanceof ExistentialCondition) {
            var condition = <ExistentialCondition>steps[0];
            if (condition.quantifier === Quantifier.Exists) {
                return null;
            }
            else {
                return steps.slice(1);
            }
        }
        // Also, successor joins are never satisfied.
        else if (steps[0] instanceof Join) {
            var join = <Join>steps[0];
            if (join.direction === Direction.Successor) {
                return null;
            }
            else {
                return steps;
            }
        }
        else {
            return steps;
        }
    }
    else {
        return steps;
    }
}

function invertSteps(steps) {
    var inverses:Array<Inverse> = [];

    var oppositeSteps:Array<Step> = [];
    for (var stepIndex = 0; stepIndex < steps.length; ++stepIndex) {
        var step = steps[stepIndex];

        if (step instanceof PropertyCondition) {
            oppositeSteps.unshift(step);
        }
        else if (step instanceof Join) {
            var join = <Join>step;
            oppositeSteps.unshift(new Join(
                join.direction === Direction.Predecessor ? Direction.Successor : Direction.Predecessor,
                join.role
            ));

            for (var conditionIndex = stepIndex + 1; conditionIndex < steps.length; ++conditionIndex) {
                var condition = steps[conditionIndex];

                if (condition instanceof PropertyCondition) {
                    oppositeSteps.unshift(condition);
                    stepIndex = conditionIndex;
                }
                else {
                    break;
                }
            }

            if (join.direction === Direction.Successor) {
                var rest = optimize(steps.slice(stepIndex + 1));
                if (rest != null) {
                    inverses.push(new Inverse(
                        new Query(oppositeSteps.slice(0)),
                        new Query(rest),
                        null
                    ));
                }
            }
        }
        else if (step instanceof ExistentialCondition) {
            var existential = <ExistentialCondition>step;
            var subInverses = invertSteps(existential.steps);
            subInverses.forEach(function(subInverse: Inverse) {
                var added = existential.quantifier === Quantifier.Exists ?
                    subInverse.added != null : subInverse.removed != null;
                var remainder = new Query(subInverse.affected.steps.concat(steps.slice(stepIndex + 1)));
                inverses.push(new Inverse(
                    new Query(subInverse.affected.steps.concat(oppositeSteps)),
                    added ? remainder : null,
                    added ? null : remainder
                ));
            });
        }
    }
    return inverses;
}

export function invertQuery(query: Query): Array<Inverse> {
    return invertSteps(query.steps);
}
