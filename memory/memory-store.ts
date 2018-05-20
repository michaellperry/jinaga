import { Join, PropertyCondition, Step, Direction, ExistentialCondition, Quantifier } from '../query/steps';
import { Query } from '../query/query';
import { FactRecord, FactReference, Storage, factReferenceEquals } from '../storage';
import { flatten } from '../util/fn';
import { formatDot } from './debug';

export function getPredecessors(fact: FactRecord, role: string) {
    const predecessors = fact.predecessors[role];
    if (predecessors) {
        if (Array.isArray(predecessors)) {
            return predecessors;
        }
        else {
            return [ predecessors ];
        }
    }
    else {
        return [];
    }
}

function loadAll(references: FactReference[], source: FactRecord[], target: FactRecord[]) {
    references.forEach(reference => {
        const predicate = factReferenceEquals(reference);
        if (!target.some(predicate)) {
            const record = source.find(predicate);
            target.push(record);
            for (const role in record.predecessors) {
                const predecessors = getPredecessors(record, role);
                loadAll(predecessors, source, target);
            }
        }
    });
}

export class MemoryStore implements Storage {
    private factRecords: FactRecord[] = [];

    save(facts: FactRecord[]): Promise<FactRecord[]> {
        const added: FactRecord[] = [];
        facts.forEach(fact => {
            if (!this.factRecords.find(factReferenceEquals(fact))) {
                this.factRecords.push(fact);
                added.push(fact);
            }
        });
        return Promise.resolve(added);
    }

    query(start: FactReference, query: Query): Promise<FactReference[]> {
        const results = this.executeQuery(start, query.steps);
        return Promise.resolve(results);
    }

    async load(references: FactReference[]): Promise<FactRecord[]> {
        let target: FactRecord[] = [];
        loadAll(references, this.factRecords, target);
        return target;
    }

    private executeQuery(start: FactReference, steps: Step[]) {
        return steps.reduce((facts, step) => {
            return this.executeStep(facts, step);
        }, [start]);
    }

    private executeStep(facts: FactReference[], step: Step): FactReference[] {
        if (step instanceof PropertyCondition) {
            if (step.name === 'type') {
                return facts.filter(fact => {
                    return fact.type === step.value;
                });
            }
        }
        else if (step instanceof Join) {
            if (step.direction === Direction.Predecessor) {
                return flatten(facts, fact => {
                    const record = this.findFact(fact);
                    return getPredecessors(record, step.role);
                });
            }
            else {
                const successors = this.factRecords.filter(fact => {
                    const predecessors = getPredecessors(fact, step.role);
                    return predecessors.find(predecessor => {
                        return !!facts.find(factReferenceEquals(predecessor));
                    });
                });
                return successors.map(successor => {
                    return {
                        type: successor.type,
                        hash: successor.hash
                    };
                });
            }
        }
        else if (step instanceof ExistentialCondition) {
            return facts.filter(fact => {
                const results = this.executeQuery(fact, step.steps);
                return step.quantifier === Quantifier.Exists ?
                    results.length > 0 :
                    results.length === 0;
            });
        }

        throw new Error('Cannot yet handle this type of step: ' + step);
    }

    private findFact(reference: FactReference): FactRecord {
        return this.factRecords.find(factReferenceEquals(reference));
    }

    debug(): string[] {
        return formatDot(this.factRecords);
    }
}
