import { Query } from './query';
import { Direction, ExistentialCondition, Join, PropertyCondition, Quantifier, Step } from './steps';

export interface Proxy {
    has(name: string): Proxy;
}

export class Clause<T, U> {
    constructor(
        public templates: ((target: Proxy) => Object)[]
    ) {
    }

    suchThat<V>(template: (target: U) => V) {
        return new Clause<T, V>(this.templates.concat([template as any]));
    }
}

export class Specification<T> {
    public existential: boolean = false;

    constructor (
        public template: T,
        public conditions: Step[]
    ) {}

    suchThat<U>(condition: (target: T) => Condition<U>): Specification<T> {
        return new Specification<T>(this.template, this.conditions.concat(parseTemplate(condition)));
    }
}

export class Condition<T> {
    public existential: boolean = true;

    constructor (
        public template: T,
        public conditions: Step[],
        public negative: boolean
    ) {}

    suchThat<U>(condition: ((target: T) => Condition<U>)): Condition<T> {
        throw new Error('Not yet implemented');
    }
}

export class Preposition<T, U> {
    constructor (
        public steps: Step[]
    ) {}

    then<V>(specification: (target : U) => Specification<V>): Preposition<T, U> {
        return new Preposition<T, U>(this.steps.concat(parseTemplate(specification)));
    }

    static for<T, U>(specification: (target : T) => Specification<U>): Preposition<T, U> {
        return new Preposition<T, U>(parseTemplate(specification));
    }
}

export class ConditionalSpecification {
    constructor(
        public specification: Object,
        public conditions: Array<(target: Proxy) => Object>,
        public isAny: boolean
    ) { }
}

export class InverseSpecification {
    constructor(
        public specification: Object
    ) { }
}

class ParserProxy implements Proxy {
    constructor(
        private __parent: ParserProxy,
        private __role: string) {
    }

    [key:string]: any;

    has(name:string):Proxy {
        const proxy = new ParserProxy(this, name);
        this[name] = proxy;
        return proxy;
    }

    public createQuery(): Array<Step> {
        const currentSteps: Array<Step> = [];
        for (const name in this) {
            const value: any = this[name];
            if (name[0] != "_" && typeof this[name] !== "function" && !(value instanceof ParserProxy)) {
                currentSteps.push(new PropertyCondition(name, value));
            }
        }
        if (this.__parent) {
            const steps = this.__parent.createQuery();
            const step: Step = new Join(Direction.Predecessor, this.__role);
            steps.push(step);
            return steps.concat(currentSteps);
        }
        else {
            return currentSteps;
        }
    }
}

function findTarget(spec:any): Array<Step> {
    if (spec instanceof ParserProxy) {
        return spec.createQuery();
    }
    if (spec instanceof ConditionalSpecification) {
        const head = findTarget(spec.specification);
        const tail = parse(spec.conditions);
        if (tail.steps.length === 1 && tail.steps[0] instanceof ExistentialCondition) {
            return head.concat(tail.steps);
        }
        else {
            return head.concat(<Step>new ExistentialCondition(Quantifier.Exists, tail.steps));
        }
    }
    if (spec instanceof InverseSpecification) {
        const steps = findTarget(spec.specification);
        if (steps.length === 1 && steps[0] instanceof ExistentialCondition) {
            const inner = <ExistentialCondition>steps[0];
            return [new ExistentialCondition(
                inner.quantifier === Quantifier.Exists ? Quantifier.NotExists : Quantifier.Exists,
                inner.steps
            )]
        }
        else {
            return [new ExistentialCondition(Quantifier.NotExists, steps)];
        }
    }
    if (Array.isArray(spec) && spec.length === 1) {
        return findTarget(spec[0]);
    }
    if (spec instanceof Object) {
        const steps: Array<Step> = [];
        let targetQuery: Array<Step> = null;
        for (const field in spec) {
            if (!targetQuery) {
                targetQuery = findTarget(spec[field]);
                if (targetQuery) {
                    const join = new Join(Direction.Successor, field);
                    targetQuery.push(join);
                }
            }
            if (typeof spec[field] === "string"||
                typeof spec[field] === "number"||
                typeof spec[field] === "boolean") {
                const step = new PropertyCondition(field, spec[field]);
                steps.push(step);
            }
        }

        if (targetQuery) {
            targetQuery = targetQuery.concat(steps);
        }
        return targetQuery;
    }
    return null;
}

function parseTemplate(template: (target: any) => any): Step[] {
    const target = new ParserProxy(null, null);
    const spec = template(target);
    const targetJoins = findTarget(spec.template);
    const steps = targetJoins.concat(spec.conditions);

    if (spec.existential) {
        return [ new ExistentialCondition(spec.negative ? Quantifier.NotExists : Quantifier.Exists, steps)];
    }
    return steps;
}

function parse(templates: Array<(target: Proxy) => Object>): Query {
    let steps: Array<Step> = [];
    templates.forEach(template => {
        const target = new ParserProxy(null, null);
        const spec = template(target);
        const targetJoins = findTarget(spec);
        steps = steps.concat(targetJoins);
    });
    return new Query(steps);
}

export function parseQuery<T, U>(preposition: Preposition<T, U>): Query {
    return new Query(preposition.steps);
}

export function parseQuery1<T, U>(clause: Clause<T, U>) {
    return parse(clause.templates);
}