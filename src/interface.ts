export enum Direction {
    Predecessor,
    Successor
}

enum Quantifier {
    Exists,
    NotExists
}

export class Condition {
    constructor() {
    }
}

class ExistentialCondition extends Condition {
    constructor(
        public quantifier: Quantifier,
        public joins: Array<Join>) {
        super();
    }
}

class PropertyCondition extends Condition {
    constructor(
        public name: string,
        public value: any) {
        super();
    }
}

export class Join {
    constructor(
        public direction: Direction,
        public role: string,
        public conditions: Array<Condition>) {
    }
}

export interface StorageProvider {
    save(
        message: Object,
        result: (error: string) => void);
    executeQuery(
        start: Object,
        joins: Array<Join>,
        result: (error: string, messages: Array<Object>) => void);
}

export interface Proxy {
    has(name: string): Proxy;
}
