export enum Direction {
    Predecessor,
    Successor
}

enum Quantifier {
    Exists,
    NotExists
}

export class Condition {
    constructor() {}
}

class ExistentialCondition extends Condition {
    constructor(
        public quantifier: Quantifier,
        public joins: Array<Join>
    ) { super(); }
}

class PropertyCondition extends Condition {
    constructor(
        public name: string,
        public value: any
    ) { super(); }
}

export class Join {
    constructor(
        public direction: Direction,
        public role: string
    ) {}
}

export class Query {
    constructor(
        public conditions: Array<Condition>
    ) {}

    public prepend(join: Join): Query {
        throw Error("Abstract");
    }
}

export class SelfQuery extends Query {
    constructor(
        conditions: Array<Condition>
    ) { super(conditions); }

    static Identity: Query = new SelfQuery([]);

    public prepend(join: Join): Query {
        return new JoinQuery(
            new SelfQuery([]),
            join,
            this.conditions
        );
    }
}

export class JoinQuery extends Query {
    constructor(
        public head: Query,
        public join: Join,
        conditions: Array<Condition>
    ) { super(conditions); }

    public prepend(join: Join): Query {
        return new JoinQuery(
            this.head.prepend(join),
            this.join,
            this.conditions
        );
    }
}

export interface StorageProvider {
    save(
        message: Object,
        result: (error: string) => void);
    executeQuery(
        start: Object,
        query: Query,
        result: (error: string, messages: Array<Object>) => void);
}

export interface Proxy {
    has(name: string): Proxy;
}
