import { Step, Join, Direction, ExistentialCondition } from './steps';

function hasSuccessor(steps: Step[]): boolean {
    return steps.some(step =>
        (step instanceof Join && step.direction === Direction.Successor) ||
        (step instanceof ExistentialCondition && hasSuccessor(step.steps))
    );
}

export class Query {
    constructor(
        public steps: Array<Step>
    ) {}

    public concat(other: Query): Query {
        return new Query(this.steps.concat(other.steps));
    }

    public toDescriptiveString(): string {
        return this.steps.map(s => s.toDeclarativeString()).join(" ");
    }

    public isDeterministic() {
        return !hasSuccessor(this.steps);
    }
}
