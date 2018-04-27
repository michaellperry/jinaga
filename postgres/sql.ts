import { Direction, ExistentialCondition, Join, PropertyCondition, Quantifier, Step } from '../query/steps';
import { FactReference } from '../storage';

export type SqlQuery = {
    sql: string,
    parameters: any[]
};

export function sqlFromSteps(start: FactReference, steps: Step[]) : SqlQuery {
    const builder = new QueryBuilder();

    return builder.buildQuery(start, steps);
}

type QueryParts = {
    prefix: string,
    fromClause: string,
    joins: string,
    whereClause: string
};

type State = {
    parts: QueryParts,
    transition: (step: Step) => State
};

class QueryBuilder {
    private parameters: any[] = [];
    private nextAlias: number = 1;

    buildQuery(start: FactReference, steps: Step[]): SqlQuery {
        const final = steps.reduce((state, step) => {
            return state.transition(step);
        }, this.stateStart(start));
        const sql = this.assembleQueryString(final.parts);
        const parameters = this.parameters;
        return { sql, parameters };
    }

    private assembleQueryString(parts: QueryParts): string {
        const sql = 'SELECT ' + parts.prefix + 'type AS type, ' + parts.prefix + 'hash AS hash ' +
            parts.fromClause + ' ' + parts.joins + ' WHERE ' + parts.whereClause;
        return sql;
    }

    private buildChildQuery(prefix: string, steps: Step[]): string {
        const final = steps.reduce((state, step) => {
            return state.transition(step);
        }, this.stateSubquery(prefix));
        return this.assembleChildQueryString(final.parts);
    }

    private assembleChildQueryString(parts: QueryParts): string {
        const sql = 'SELECT 1 ' + parts.fromClause + ' ' + parts.joins + ' WHERE ' + parts.whereClause;
        return sql;
    }

    private stateStart(start: FactReference): State {
        return {
            parts: null,
            transition: (step: Step) => this.transitionFromStart(start, step)
        };
    }

    private transitionFromStart(start: FactReference, step: Step): State {
        if (step instanceof Join) {
            if (step.direction === Direction.Successor) {
                return this.handleStartSuccessor(start, step.role);
            }
        }
    
        throw new Error("Cannot yet handle this query.");
    }

    private handleStartSuccessor(start: FactReference, role: string): State {
        const alias = this.allocateAlias();
        const prefix = alias + '.successor_';
        const fromClause = 'FROM public.edge ' + alias;
        const joins = '';
        const whereClause = alias + '.predecessor_type = ' + this.addParameter(start.type) +
            ' AND ' + alias + '.predecessor_hash = ' + this.addParameter(start.hash) +
            ' AND ' + alias + '.role = ' + this.addParameter(role);
        const parts = { prefix, fromClause, joins, whereClause };

        return this.stateMatched(parts);
    }

    private stateSubquery(prefix: string): State {
        return {
            parts: null,
            transition: (step: Step) => this.transitionFromSubquery(prefix, step)
        };
    }

    private transitionFromSubquery(prefix: string, step: Step): State {
        if (step instanceof Join) {
            if (step.direction === Direction.Successor) {
                return this.handleSubquerySuccessor(prefix, step.role);
            }
        }
    
        throw new Error("Cannot yet handle this query.");
    }

    private handleSubquerySuccessor(outerPrefix: string, role: string): State {
        const alias = this.allocateAlias();
        const fromClause = 'FROM public.edge ' + alias;
        const joins = '';
        const prefix = alias + '.successor_';
        const whereClause = alias + '.predecessor_type = ' + outerPrefix + 'type' +
            ' AND ' + alias + '.predecessor_hash = ' + outerPrefix + 'hash' +
            ' AND ' + alias + '.role = ' + this.addParameter(role);
        const parts = { prefix, fromClause, joins, whereClause };

        return this.stateMatched(parts);
    }

    private stateMatched(parts: QueryParts): State {
        return {
            parts,
            transition: (step: Step) => this.transitionFromMatched(parts, step)
        };
    }

    private transitionFromMatched(parts: QueryParts, step: Step): State {
        if (step instanceof PropertyCondition && step.name === "type") {
            return this.handleMatchedType(parts, step.value);
        }
        else if (step instanceof ExistentialCondition) {
            return this.handleMatchedExistentialCondition(parts, step.quantifier, step.steps);
        }

        throw new Error("Cannot yet handle this query.");
    }

    private handleMatchedType(parts: QueryParts, type: string): State {
        const whereClause = parts.whereClause +
            ' AND ' + parts.prefix + 'type = ' + this.addParameter(type);
        return this.stateMatched({
            prefix: parts.prefix,
            fromClause: parts.fromClause,
            joins: parts.joins,
            whereClause
        });
    }

    private handleMatchedExistentialCondition(parts: QueryParts, quantifier: Quantifier, steps: Step[]): State {
        const existence = quantifier === Quantifier.Exists ? 'EXISTS' : 'NOT EXISTS';
        const childQuery = this.buildChildQuery(parts.prefix, steps);
        const whereClause = parts.whereClause +
            ' AND ' + existence + ' (' + childQuery + ')';
        return this.stateMatched({
            prefix: parts.prefix,
            fromClause: parts.fromClause,
            joins: parts.joins,
            whereClause
        });
    }

    private allocateAlias() {
        return 'e' + this.nextAlias++;
    }

    private addParameter(value: any) {
        this.parameters.push(value);
        return '$' + this.parameters.length;
    }
}
