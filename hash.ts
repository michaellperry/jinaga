export function computeHash(obj: { [key: string]: any }): number {
    if (!obj)
        return 0;

    let hash = 0;
    for (const name in obj) {
        if (obj.hasOwnProperty(name)) {
            const valueHash = computeValueHash(obj[name]);
            const nameHash = computeStringHash(name);
            hash += (nameHash << 5) - nameHash + valueHash;
        }
    }
    return hash;
}

function computeValueHash(value: any) {
    switch (typeof(value)) {
        case 'string':
            return computeStringHash(value);
        case 'number':
            return computeNumberHash(value);
        case 'object':
            if (value instanceof Date) {
                return (<Date>value).getTime();
            }
            else if (Array.isArray(value)) {
                return value.reduce((sum, v) => sum + computeHash(v), 0);
            }
            else {
                return computeHash(value);
            }
        case 'boolean':
            return value ? 1 : 0;
        default:
            throw new TypeError('Cannot compute the hash of a ' + typeof(value));
    }
}

function computeStringHash(str: string): number {
    if (!str)
        return 0;

    let hash = 0;
    for (let index = 0; index < str.length; index++) {
        hash = (hash << 5) - hash + str.charCodeAt(index);
    }
    return hash;
}

function computeNumberHash(val: number): number {
    return val | 0;
}