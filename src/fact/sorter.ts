import { FactRecord, FactReference } from '../storage';

export class TopologicalSorter {
    private factsVisited: { [key: string]: boolean } = {};
    private factsWaiting: { [key: string]: FactRecord[] } = {};

    sort(facts: FactRecord[]): FactRecord[] {
        let factsReceived: FactRecord[] = [];
        let factQueue = facts.slice(0);

        while (factQueue.length > 0) {
            const fact = factQueue.shift();
            const waitingPredecessors = this.allPredecessors(fact).filter(key => {
                return !this.factsVisited[key];
            });
            if (waitingPredecessors.length === 0) {
                const key = this.factKey(fact);
                this.factsVisited[key] = true;
                factsReceived.push(fact);
                const retry = this.factsWaiting[key];
                if (retry) {
                    retry.forEach(r => {
                        if (!factQueue.some(f => f.type === r.type && f.hash === r.hash)) {
                            factQueue.push(r);
                        }
                    });
                    this.factsWaiting[key] = null;
                }
            }
            else {
                waitingPredecessors.forEach(key => {
                    let list = this.factsWaiting[key];
                    if (!list) {
                        list = [];
                        this.factsWaiting[key] = list;
                    }
                    if (!list.some(f => f.type === fact.type && f.hash === fact.hash)) {
                        list.push(fact);
                    }
                });
            }
        }

        return factsReceived;
    }

    finished(): boolean {
        for (const key in this.factsWaiting) {
            if (this.factsWaiting[key]) {
                return false;
            }
        }

        return true;
    }

    private allPredecessors(fact: FactRecord): string[] {
        let predecessors: string[] = [];

        for (const role in fact.predecessors) {
            const references = fact.predecessors[role];
            if (Array.isArray(references)) {
                predecessors = predecessors.concat(references.map(r => this.factKey(r)));
            }
            else {
                predecessors.push(this.factKey(references));
            }
        }

        return predecessors;
    }

    private factKey(fact: FactReference): string {
        return `${fact.type}:${fact.hash}`;
    }
}