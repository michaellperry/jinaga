export interface Proxy {
    has(name: string): Proxy;
}

export class ConditionalSpecification {
    constructor(
        public specification: Object,
        public conditions: Array<(target: Proxy) => Object>,
        public isAny: boolean
    ) { }
}
