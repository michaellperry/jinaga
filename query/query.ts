import { Step } from './steps';

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
}
