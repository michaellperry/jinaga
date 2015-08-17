/*
 * TODO: This file should be broken down once these ideas get more fleshed out.
 * But for now, I wanted to see them all at once.
 */

enum Direction {
    Predecessor,
    Successor
}

enum Quantifier {
    Exists,
    NotExists
}

class Condition {
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

class Join {
    constructor(
        public direction: Direction,
        public role: string,
        public conditions: Array<Condition>) {
    }
}

class Inverse {
    constructor(
        public targets: Array<Join>,
        public added: Array<Join>,
        public removed: Array<Join>) {
    }
}

class Query {
    constructor(
        public start: Object,
        public joins: Array<Join>,
        public resultAdded: (message: Object) => void,
        public resultRemoved: (message: Object) => void,
        public inverses: Array<Inverse>) {
    }
}

interface StorageProvider {
    save(
        message: Object,
        result: (error: string) => void);
    executeQuery(
        start: Object,
        joins: Array<Join>,
        result: (error: string, messages: Array<Object>) => void);
}

class Jinaga {
    private queries: Array<Query> = new Array<Query>();
    private messages: Object[] = [];

    public save(storage: StorageProvider) {
    }

    public fact(message: Object) {
        this.messages.push(message);

        for (var i = 0; i < this.queries.length; i++) {
            this.queries[i].resultAdded(message);
        }
    }

    public query(
        start: Object,
        templates: Array<(target: Object) => Object>,
        resultAdded: (result: Object) => void,
        resultRemoved: (result: Object) => void) {

        this.queries.push(new Query(
            start,
            [],
            resultAdded,
            resultRemoved,
            []));

        for (var i = 0; i < this.messages.length; i++) {
            resultAdded(this.messages[i]);
        }
    }
}

export = Jinaga;
