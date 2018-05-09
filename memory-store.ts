import { Join, PropertyCondition, Step, Direction } from './query/steps';
import { Query } from './query/query';
import { FactRecord, FactReference, Storage, factReferenceEquals } from './storage';

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
        const results = query.steps.reduce((facts, step) => {
            return this.executeStep(facts, step);
        }, [start]);
        return Promise.resolve(results);
    }

    load(references: FactReference[]): Promise<FactRecord[]> {
        throw new Error('Not implemented');
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
                return facts.map(fact => {
                    const record = this.findFact(fact);
                    const predecessors = record.predecessors[step.role];
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
                }).reduce((a,b) => a.concat(b));
            }
        }

        throw new Error('Cannot yet handle this type of step: ' + step);
    }

    private findFact(reference: FactReference): FactRecord {
        return this.factRecords.find(factReferenceEquals(reference));
    }
}