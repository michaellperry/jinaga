import Interface = require('./interface');

import Query = Interface.Query;
import Step = Interface.Step;
import PropertyCondition = Interface.PropertyCondition;
import Join = Interface.Join;
import ExistentialCondition = Interface.ExistentialCondition;

function scanForEndOfSegment(steps: Step[]) {
    let index = 1;
    for(; index < steps.length && steps[index] instanceof PropertyCondition; index++);
    return index;
}

function childSegments(head: Step[], tail: Step[]) : Query[] {
    if (tail.length > 0) {
        if (tail[0] instanceof Join) {
            const index: number = scanForEndOfSegment(tail);
            const nextHead: Step[] = head.concat(tail.slice(0, index));
            if ((<Join>tail[0]).direction === Interface.Direction.Successor) {
                return [new Query(nextHead)]
                    .concat(childSegments(nextHead, tail.slice(index)));
            }
            else {
                return childSegments(nextHead, tail.slice(index));
            }
        }
        else if (tail[0] instanceof ExistentialCondition) {
            const subquery: ExistentialCondition = tail[0] as ExistentialCondition;
            const conditional = childSegments(head, subquery.steps);
            return conditional
                .concat(childSegments(head, tail.slice(1)));
        }
        else {
            return childSegments(head, tail.slice(1));
        }
    }
    else {
        return [];
    }
}

function splitSegments(query: Query) : Query[] {
    const segments: Query[] = childSegments([], query.steps);
    return segments;
}

export = splitSegments;