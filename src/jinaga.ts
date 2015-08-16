class Query {
    constructor(public resultAdded: (message: Object) => void) {
    }
}

class Jinaga {
    private queries: Array<Query> = new Array<Query>();
    private messages: Object[] = [];

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

        this.queries.push(new Query(resultAdded));

        for (var i = 0; i < this.messages.length; i++) {
            resultAdded(this.messages[i]);
        }
    }
}

export = Jinaga;
