class FactChannel {
    constructor(
        private output: (string) => void
    ) {
    }
    
    send(fact: Object) {
        this.output(JSON.stringify({
            id: 1,
            fact: fact
        }));
    }
}

export = FactChannel;
