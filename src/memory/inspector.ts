import { FactRecord, FactReference, factReferenceEquals } from '../storage';

type StoreInspector = { [type: string]: { count: number } };
type FactInspector = { type: string, fields: {}, predecessors: PredecessorInspector };
type PredecessorInspector = { [ role: string ]: ({} | {}[]) };
type SuccessorInspector = { [role: string]: FactInspector[] };

export class Inspector {
    constructor (
        private factRecords: FactRecord[]
    ) { }

    inspect() {
        return this.factRecords.reduce((inspector: StoreInspector, record) => {
            let typeInspector = inspector[record.type];
            if (!typeInspector) {
                typeInspector = this.createTypeInspector(record.type);
                inspector[record.type] = typeInspector;
            }
            typeInspector.count++;
            return inspector;
        }, {});
    }

    private createTypeInspector(type: string) {
        const typeInspector = { count: 0 };
        Object.defineProperty(typeInspector, 'facts', {
            enumerable: true,
            get: () => {
                return this.getFactsByType(type);
            }
        });
        return typeInspector;
    }

    private getFactsByType(type: string) {
        return (this.factRecords
            .filter(record => record.type === type)
            .map(record => {
                return this.createFactInspector(record);
            })
        );
    }

    private createFactInspector(record: FactRecord): FactInspector {
        const factInspector = {
            type: record.type,
            fields: record.fields,
            predecessors: this.getPredecessors(record)
        };
        Object.defineProperty(factInspector, 'successors', {
            enumerable: true,
            get: () => {
                return this.getSuccessors(record);
            }
        });
        return factInspector;
    }

    private getPredecessors(record: FactRecord) {
        const inspector: PredecessorInspector = {};
        for (const role in record.predecessors) {
            const predecessors = record.predecessors[role];
            if (Array.isArray(predecessors)) {
                inspector[role] = predecessors.map(p => {
                    return this.createReferenceInspector(p);
                });
            }
            else {
                inspector[role] = this.createReferenceInspector(predecessors);
            }
        }
        return inspector;
    }

    private getSuccessors(reference: FactReference) {
        return this.factRecords.reduce((inspector: SuccessorInspector, record) => {
            for (const role in record.predecessors) {
                let predecessors = record.predecessors[role];
                if (!Array.isArray(predecessors)) {
                    predecessors = [ predecessors ];
                }
                if (predecessors.some(factReferenceEquals(reference))) {
                    let successors = inspector[role];
                    if (!successors) {
                        successors = [];
                        inspector[role] = successors;
                    }
                    successors.push(this.createFactInspector(record));
                }
            }
            return inspector;
        }, {});
    }

    private createReferenceInspector(reference: FactReference) {
        const inspector = {};
        Object.defineProperty(inspector, 'fact', {
            enumerable: true,
            get: () => {
                return this.createFactInspector(this.findFact(reference));
            }
        });
        return inspector;
    }

    private findFact(reference: FactReference): FactRecord {
        return this.factRecords.find(factReferenceEquals(reference));
    }
}