export interface TemplateList<T, U> {

}

export interface Clause<T, U> {

}

export interface Profile {
    displayName: string;
}

export class Jinaga {
    onError(handler: (message: string) => void): void {
        throw new Error('Not implemented');
    }

    onLoading(handler: (loading: boolean) => void): void {
        throw new Error('Not implemented');
    }

    onProgress(handler: (queueCount: number) => void): void {
        throw new Error('Not implemented');
    }

    query<T, U>(start: T, templates: TemplateList<T, U>, done: (result: U[]) => void): void {
        throw new Error('Not implemented');
    }

    login<User>(callback: (userFact: User, profile: Profile) => void): void {
        throw new Error('Not implemented');
    }

    fact<T>(prototype: T) : T {
        throw new Error('Not implemented');
    }
    
    where<T, U>(specification: Object, templates: TemplateList<T, U>): T {
        throw new Error('Not implemented');
    }

    suchThat<T, U>(template: ((target: T) => U)): Clause<T, U> {
        throw new Error('Not implemented');
    }

    not<T, U>(condition: (target: T) => U): (target: T) => U;
    not<T>(specification: T): T;
    not<T, U>(conditionOrSpecification: ((target: T) => U) | T): ((target: T) => U) | T {
        throw new Error('Not implemented');
    }
}