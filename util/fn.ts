export async function flattenAsync<T, U>(collection: T[], selector: (element: T) => Promise<U[]>) {
    const results = await Promise.all(collection.map(selector));
    return results.reduce((a,b) => a.concat(b));
}
