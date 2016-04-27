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
    let predecessors = relations
        .map(r => ({
            role: r.role,
            hash: computeHash(r.predecessor)
        }));
    predecessors.sort((a, b) => {
        if (a.role < b.role)
            return -1;
        else if (a.role > b.role)
            return 1;
        else if (a.hash < b.hash)
            return -1;
        else if (a.hash > b.hash)
            return 1;
        else
            return 0;
    });
    let document = {
        hash: computeHash(fact),
        predecessors: predecessors,
        fact: fact
    };
    
    let count = relations.length;
    if (count === 0)
        done(null, []);
    else {
        collection.insertOne(document, (e) => {
            if (e) {
                if (e.code != 11000) {
                    done(e.message, null);
                }
                else {
                    done(null, []);
                }
            }
            else {
                let error: string = null;
                let saved: Array<Object> = [];
                relations.forEach(r => {
                    saveFact(collection, r.predecessor, (e,s) => {
                        error = error || e;
                        saved = saved.concat(s);
                        count--;
                        if (count === 0) {
                            done(error, saved.concat(fact));
                        }
                    });
                });
            }
        });
    }
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
