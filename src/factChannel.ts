import Interface = require('./interface');
import isPredecessor = Interface.isPredecessor;
import Collections = require("./collections");
import _isEqual = Collections._isEqual;

class FactReference {
    constructor(
        public id: number
    ) {
    }
}

class FactChannel {
    private nextId: number;
    private nodes: { [hash: number]: Array<{id: number, fact: Object}> } = {};
    
    constructor(
        private output: (Object) => void
    ) {
        this.nextId = 1;
    }
    
    public sendFact(fact: Object): FactReference {
        var hash = Interface.computeHash(fact);
        var existing = this.findExistingFact(hash, fact);
        if (existing)
            return existing;
        else
            return this.sendNewFact(hash, fact);
    }
    
    private findExistingFact(hash: number, fact: Object): FactReference {
        var array = this.nodes[hash];
        if (array) {
            var matches = array
                .filter(n => _isEqual(n.fact, fact))
                .map(n => n.id);
            if (matches.length > 0) {
                return new FactReference(matches[0]);
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
            fact: memento
        });
        this.addNewFact(hash, this.nextId, fact);
        var reference = new FactReference(this.nextId);
        this.nextId += 2;
        return reference;
    }
    
    private addNewFact(hash: number, id: number, fact: Object) {
        if (!this.nodes[hash]) {
            this.nodes[hash] = [];
        }
        this.nodes[hash].push({ id: id, fact: fact });
    }
}

export = FactChannel;
