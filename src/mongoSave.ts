import Interface = require("./interface");
import computeHash = Interface.computeHash;
import isPredecessor = Interface.isPredecessor;

class Relation {
    constructor (
        public role: string,
        public predecessor: Object) { }
}

export function saveFact(collection: any, fact: Object, done: (error: string, saved: Array<Object>) => void) {
    let relations = getRelations(fact);
    let count = relations.length;
    let error: string = null;
    let any: boolean = false;
    let saved: Array<Object> = [];
    if (count === 0)
        done(error, saved);
    else {
        relations.forEach(r => {
            saveSuccessor(collection, r.predecessor, r.role, fact, (e, a, s) => {
                error = error || e;
                any = any || a;
                Array.prototype.push.apply(saved, s);
                count--;
                if (count === 0) {
                    if (any)
                        done(error, saved.concat(fact));
                    else
                        done(error, saved);
                }
            });
        });
    }
}

function saveSuccessor(
    collection: any,
    predecessor: Object,
    role: string,
    successor: Object,
    done: (error: string, any: boolean, saved: Array<Object>) => void) {
    var document = {
        predecessorHash: computeHash(predecessor),
        role: role,
        successorHash: computeHash(successor),
        predecessor: predecessor,
        successor: successor
    };
    collection.insertOne(document, (err) => {
        if (err) {
            if (err.code != 11000) {
                done(err.message, false, []);
            }
            else {
                done(null, false, []);
            }
        }
        else {
            saveFact(collection, predecessor, (e, s) => {
                if (e)
                    done(e, false, []);
                else
                    done(null, true, s);
            });
        }
    });
}

function getRelations(fact: Object): Array<Relation> {
    let predecessors: Array<Relation> = [];
    for (var field in fact) {
        var value = fact[field];
        if (isPredecessor(value)) {
            predecessors.push(new Relation(field, value));
        }
        else if (Array.isArray(value) && value.every(v => isPredecessor(v))) {
            value.forEach(v => {
                predecessors.push(new Relation(field, v));
            });
        }
    }
    return predecessors;
}
