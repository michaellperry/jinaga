import Interface = require('../interface');
import isPredecessor = Interface.isPredecessor;
import Collections = require("../utility/collections");
import _isEqual = Collections._isEqual;

class FactReference {
    constructor(
        public id: number,
        public hash: number
    ) {
    }
}

export class FactChannel {
    private nextId: number;
    private nodes: { [hash: number]: Array<{id: number, fact: Object}> } = {};
    
    constructor(
        nextId: number,
        private output: (Object) => void,
        private onFactReceived: (Object) => void
    ) {
        this.nextId = nextId;
    }
    
    public sendFact(fact: Object): FactReference {
        var hash = Interface.computeHash(fact);
        var existing = this.findExistingFact(hash, fact);
        if (existing)
            return existing;
        else
            return this.sendNewFact(hash, fact);
    }
    
    public messageReceived(message: any) {
        if (message.type === 'fact' && message.hasOwnProperty("id") && message.hasOwnProperty("fact")) {
            let fact = {};
            for (let field in message.fact) {
                let value = message.fact[field]
                if (Array.isArray(value)) {
                    fact[field] = value.map(v => this.parseMessageValue(v));
                }
                else {
                    fact[field] = this.parseMessageValue(value);
                }
            }
            this.addNewFact(Interface.computeHash(fact), message.id, fact);
            this.onFactReceived(fact);
        }
    }
    
    private findExistingFact(hash: number, fact: Object): FactReference {
        var array = this.nodes[hash];
        if (array) {
            var matches = array
                .filter(n => _isEqual(n.fact, fact))
                .map(n => n.id);
            if (matches.length > 0) {
                return new FactReference(matches[0], hash);
            }
        }
        return null;
    }
    
    private sendNewFact(hash: number, fact: Object): FactReference {
        var memento = {};
        for (var field in fact) {
            var value = fact[field];
            if (isPredecessor(value)) {
                memento[field] = this.sendFact(value);
            }
            else if (Array.isArray(value)) {
                memento[field] = value.map(v => this.sendFact(v));
            }
            else {
                memento[field] = value;
            }
        }
        this.output({
            type: 'fact',
            id: this.nextId,
            fact: memento,
            token: hash
        });
        this.addNewFact(hash, this.nextId, fact);
        var reference = new FactReference(this.nextId, hash);
        this.nextId += 2;
        return reference;
    }
    
    private addNewFact(hash: number, id: number, fact: Object) {
        if (!this.nodes[hash]) {
            this.nodes[hash] = [];
        }
        this.nodes[hash].push({ id: id, fact: fact });
    }
    
    private parseMessageValue(value: any) {
        if (typeof(value) === 'object' && value.hasOwnProperty("hash") && value.hasOwnProperty("id")) {
            return this.lookupFact(value.hash, value.id);
        }
        else {
            return value;
        }
    }
    
    private lookupFact(hash: number, id: number): Object {
        let array = this.nodes[hash];
        if (array) {
            let matches = array
                .filter(n => n.id === id)
                .map(n => n.fact);
            if (matches.length > 0) {
                return matches[0];
            }
        }
        return null;
    }
}