export async function flattenAsync<T, U>(collection: T[], selector: (element: T) => Promise<U[]>) {
    if (collection.length === 0) {
        return [];
    }
    else {
        const results = await Promise.all(collection.map(selector));
        return results.reduce((a,b) => a.concat(b));
    }
}

export function flatten<T, U>(collection: T[], selector: (element: T) => U[]) {
    if (collection.length === 0) {
        return [];
    }
    else {
        return collection.map(selector).reduce((a,b) => a.concat(b));
    }
}

export async function mapAsync<T, U>(collection: T[], action: (element: T) => Promise<U>) {
    if (collection.length === 0) {
        return [];
    }
    else {
        return await Promise.all(collection.map(action));
    }
}