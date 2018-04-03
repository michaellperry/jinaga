import * as jsSHA from 'jssha';
import { FactRecord, FactReference } from './storage';

export function computeHash(fact: FactRecord) {
    if (!fact)
        return '';

    return computeObjectHash({
        fields: fact.fields,
        predecessors: canonicalPredecessors(fact.predecessors)
    });
}

function canonicalPredecessors(predecessors: { [role: string]: FactReference[] })
    : { [role: string]: FactReference[] } {
    let result: { [role: string]: FactReference[] } = {};
    for(const role in predecessors) {
        const referenceMessages = predecessors[role];
        result[role] = sortedPredecessors(referenceMessages);
    }
    return result;
}

function sortedPredecessors(predecessors: FactReference[]) {
    return predecessors.slice().sort((a,b) => {
        if (a.hash < b.hash)
            return -1;
        else if (a.hash > b.hash)
            return 1;
        if (a.type < b.type)
            return -1;
        else if (a.type > b.type)
            return 1;
        else
            return 0;
    });
}

function computeObjectHash(obj: {}) {
    if (!obj)
        return '';

    const str = canonicalize(obj);
    const shaObj = new jsSHA("SHA-256", "TEXT");
    shaObj.update(str);
    return shaObj.getHash("B64");
}

type Pair = { key: string, value: any };

function canonicalize(obj: { [key: string]: any }) {
    let pairs: Pair[] = [];
    for (const key in obj) {
        const value = obj[key];
        pairs.push({ key, value });
    }
    pairs.sort((a, b) => {
        if (a.key < b.key)
            return -1;
        else if (a.key > b.key)
            return 1;
        else
            return 0;
    });
    const members = pairs.reduce((text, pair) => {
        if (text.length > 0)
            text += ',';
        text += '"' + pair.key + '":' + serialize(pair.value);
        return text;
    }, '');
    return '{' + members + '}';
}

function serialize(value: any) {
    if (typeof(value) === 'object') {
        if (value instanceof Date) {
            return 'Date.parse("' + value.toISOString() + '")';
        }
        else if (Array.isArray(value)) {
            const values = value.reduce((text, element) => {
                if (text.length > 0)
                    text += ',';
                text += serialize(element);
                return text;
            }, '');
            return '[' + values + ']';
        }
        else {
            return canonicalize(value);
        }
    }
    else {
        return JSON.stringify(value);
    }
}