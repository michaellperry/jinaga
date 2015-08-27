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

    public toDescriptiveString(): string {
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

    public toDescriptiveString(): string {
        return "()";
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

    public toDescriptiveString(): string {
        return this.head.toDescriptiveString() +
            (this.join.direction === Direction.Predecessor ? "P." : "S.") +
            this.join.role +
            "()";
    }
}

function done(descriptive: string, index: number): boolean {
    return index === descriptive.length;
}

function lookahead(descriptive: string, index: number): string {
    if (descriptive.length <= index) {
        throw Error("Malformed descriptive string " + descriptive + " at " + index);
    }
    return descriptive.charAt(index);
}

function consume(descriptive: string, index: number, expected: string): number {
    if (lookahead(descriptive, index) !== expected) {
        throw Error("Malformed descriptive string " + descriptive + " at " + index);
    }
    return index + 1;
}

function identifier(descriptive: string, index: number): {id: string, index: number} {
    var id = "";
    var next = lookahead(descriptive, index);
    while ((next >= "a" && next <= "z") || (next >= "A" && next <= "Z")) {
        index = consume(descriptive, index, next);
        id = id + next;
        next = lookahead(descriptive, index);
    }
    return {id, index};
}

export function fromDescriptiveString(descriptive: string, index: number = 0): Query {
    var result: Query = new SelfQuery([]);
    while (true) {
        index = consume(descriptive, index, "(");
        index = consume(descriptive, index, ")");
        if (done(descriptive, index)) {
            return result;
        }
        if (lookahead(descriptive, index) === "P") {
            index = consume(descriptive, index, "P");
            index = consume(descriptive, index, ".");
            var {id, index} = identifier(descriptive, index);
            result = new JoinQuery(result, new Join(Direction.Predecessor, id), []);
        }
        else if (lookahead(descriptive, index) === "S") {
            index = consume(descriptive, index, "S");
            index = consume(descriptive, index, ".");
            var {id, index} = identifier(descriptive, index);
            result = new JoinQuery(result, new Join(Direction.Successor, id), []);
        }
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
