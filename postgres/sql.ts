import { Direction, Join, PropertyCondition, Step, ExistentialCondition, Quantifier } from '../query/steps';
import { FactReference } from '../storage';

export type SqlQuery = {
    sql: string,
    parameters: any[]
};

export function sqlFromSteps(start: FactReference, steps: Step[]) : SqlQuery {
    const builder = new QueryBuilder();

    const parts = builder.sqlFromSteps(start, steps);
    return builder.assembleQuery(parts);
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

    sqlFromSteps(start: FactReference, steps: Step[]): QueryParts {
        const final = steps.reduce((state, step) => {
            return state.transition(step);
        }, this.stateStart(start));
        return final.parts;
    }
    
    assembleQuery(parts: QueryParts): SqlQuery {
        const sql = this.assembleQueryString(parts);
        const parameters = this.parameters;
        return { sql, parameters };
    }

    private assembleQueryString(parts: QueryParts): string {
        const sql = 'SELECT ' + parts.prefix + 'type AS type, ' + parts.prefix + 'hash AS hash ' +
            parts.fromClause + ' ' + parts.joins + ' WHERE ' + parts.whereClause;
        return sql;
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
        const alias = this.allocateAlias();
        const fromClause = 'FROM public.edge ' + alias;
        const joins = parts.joins;
        const prefix = alias + '.predecessor_';
        const childWhereClause = prefix + 'type = ' + parts.prefix + 'type' +
            ' AND ' + prefix + 'hash = ' + parts.prefix + 'hash';
        const childQuery = this.assembleChildQueryString(
            { prefix, fromClause, joins, whereClause: childWhereClause }
        );
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
