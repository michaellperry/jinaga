import _ = require("lodash");

export enum Direction {
    Predecessor,
    Successor
}

enum Quantifier {
    Exists,
    NotExists
}

export class Step {
    construtor() {}

    public toDeclarativeString(): string {
        throw Error("Abstract");
    }
}

class ExistentialCondition extends Step {
    constructor(
        public quantifier: Quantifier,
        public steps: Array<Step>
    ) { super(); }
}

export class PropertyCondition extends Step {
    constructor(
        public name: string,
        public value: any
    ) { super(); }

    public toDeclarativeString(): string {
        return "F." + this.name + "=\"" + this.value + "\"";
    }
}

export class Join extends Step {
    constructor(
        public direction: Direction,
        public role: string
    ) { super(); }

    public toDeclarativeString(): string {
        return (this.direction === Direction.Predecessor ? "P." : "S.") + this.role;
    }
}

export class Query {
    constructor(
        public steps: Array<Step>
    ) {}

    public toDescriptiveString(): string {
        return _.map(this.steps, s => s.toDeclarativeString()).join(" ");
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
    while (
        !done(descriptive, index) &&
        lookahead(descriptive, index) !== " " &&
        lookahead(descriptive, index) !== "=") {

        var next = lookahead(descriptive, index);
        index = consume(descriptive, index, next);
        id = id + next;
    }
    return {id, index};
}

function quotedValue(descriptive: string, index: number): {value: string, index: number} {
    var value = "";
    index = consume(descriptive, index, "\"");
    while (lookahead(descriptive, index) !== "\"") {
        var next = lookahead(descriptive, index);
        index = consume(descriptive, index, next);
        value = value + next;
    }
    index = consume(descriptive, index, "\"");
    return {value, index};
}

export function fromDescriptiveString(descriptive: string, index: number = 0): Query {
    if (done(descriptive, index)) {
        return new Query([]);
    }

    var steps: Array<Step> = [];
    while (true) {
        var next = lookahead(descriptive, index);
        if (next === "P") {
            index = consume(descriptive, index, "P");
            index = consume(descriptive, index, ".");
            var {id, index} = identifier(descriptive, index);
            var join = new Join(Direction.Predecessor, id);
            steps.push(join);
        }
        else if (next === "S") {
            index = consume(descriptive, index, "S");
            index = consume(descriptive, index, ".");
            var {id, index} = identifier(descriptive, index);
            var join = new Join(Direction.Successor, id);
            steps.push(join);
        }
        else if (next === "F") {
            index = consume(descriptive, index, "F");
            index = consume(descriptive, index, ".");
            var {id, index} = identifier(descriptive, index);
            index = consume(descriptive, index, "=");
            var {value, index} = quotedValue(descriptive, index);
            var property = new PropertyCondition(id, value);
            steps.push(property);
        }
        else {
            throw Error("Malformed descriptive string " + descriptive + " at " + index);
        }

        if (done(descriptive, index)) {
            return new Query(steps);
        }
        index = consume(descriptive, index, " ");
    }
}

export interface StorageProvider {
    save(
        message: Object,
        enqueue: Boolean,
        result: (error: string, saved: Boolean) => void,
        thisArg: Object
    );
    executeQuery(
        start: Object,
        query: Query,
        result: (error: string, messages: Array<Object>) => void,
        thisArg: Object
    );
    sync(network: NetworkProvider);
}

export interface NetworkProvider {
    connect(factReceived: (message: Object) => void);
    watch(start: Object, query: Query);
    fact(fact: Object);
}


export interface Proxy {
    has(name: string): Proxy;
}
