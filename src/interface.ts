import Collections = require('./collections');
import _pairs = Collections._pairs;

export class InverseSpecification {
    constructor(
        public specification: Object
    ) { }
}

export function isPredecessor(value: any): boolean {
    if (value === null)
        return false;
        
    if (typeof(value) !== "object")
        return false;

    if (value instanceof Date)
        return false;

    if (Array.isArray(value))
        return false;

    return true;
}

export function computeHash(fact: Object): number {
    if (!fact)
        return 0;

    var hash = _pairs(fact).map(computeMemberHash, this)
        .reduce(function(agg, current){
            return agg + current;
        }, 0) | 0;
    return hash;
}

function computeMemberHash(pair: [any]): number {
    var name = pair[0];
    var value = pair[1];

    var valueHash = 0;
    switch (typeof(value)) {
        case "string":
            valueHash = computeStringHash(value);
            break;
        case "number":
            valueHash = computeNumberHash(value);
            break;
        case "object":
            if (value instanceof Date) {
                valueHash = (<Date>value).getTime();
            }
            else if (Array.isArray(value)) {
                valueHash = value.reduce((sum, v) => sum + computeHash(v), 0);
            }
            else {
                valueHash = computeHash(value);
            }
            break;
        case "boolean":
            valueHash = value ? 1 : 0;
            break;
        default:
            throw new TypeError("Property " + name + " is a " + typeof(value));
    }

    var nameHash = computeStringHash(name);
    return ((nameHash << 5) - nameHash + valueHash) | 0;
}

function computeStringHash(str: string): number {
    if (!str)
        return 0;

    var hash = 0;
    for (var index = 0; index < str.length; index++) {
        hash = (hash << 5) - hash + str.charCodeAt(index);
    }
    return hash;
}

function computeNumberHash(val: number): number {
    return val | 0;
}

export interface Coordinator {
    onSaved(fact: Object, source: any);
    send(fact: Object, source: any);
    onReceived(fact: Object, userFact: Object, source: any);
    onDelivered(token: number, destination: any);
    onDone(token: number);
    onProgress(queueCount: number);
    onError(err: string);
    onLoggedIn(userFact: Object, profile: Object);
    resendMessages();
}
