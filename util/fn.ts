export async function flattenAsync<T, U>(collection: T[], selector: (element: T) => Promise<U[]>) {
    const results = await Promise.all(collection.map(selector));
    return results.reduce((a,b) => a.concat(b));
}

export function flatten<T, U>(collection: T[], selector: (element: T) => U[]) {
    return collection.map(selector).reduce((a,b) => a.concat(b));
}

export async function mapAsync<T, U>(collection: T[], action: (element: T) => Promise<U>) {
    return await Promise.all(collection.map(action));
}