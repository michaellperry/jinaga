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

class QueryBuilder {
    private parameters: any[] = [];
    private nextAlias: number = 1;

    sqlFromSteps(start: FactReference, steps: Step[]): QueryParts {
        if (steps.length >= 1) {
            const firstStep = steps[0];
            if (firstStep instanceof Join) {
                if (firstStep.direction === Direction.Successor) {
                    return this.sqlFromSuccessor(start, firstStep.role, steps.slice(1));
                }
            }
        }
    
        throw new Error("Cannot yet handle this query.");
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

    private sqlFromSuccessor(start: FactReference, role: string, steps: Step[]): QueryParts {
        const alias = this.allocateAlias();
        const prefix = alias + '.successor_';
        const fromClause = 'FROM public.edge ' + alias;
        const joins = '';
        const whereClause = alias + '.predecessor_type = ' + this.addParameter(start.type) +
            ' AND ' + alias + '.predecessor_hash = ' + this.addParameter(start.hash) +
            ' AND ' + alias + '.role = ' + this.addParameter(role);

        return this.sqlWithConditions({ prefix, fromClause, joins, whereClause }, steps);
    }

    private sqlWithConditions(parts: QueryParts, steps: Step[]): QueryParts {
        if (steps.length === 0) {
            return parts;
        }
        else {
            const nextStep = steps[0];
            if (nextStep instanceof PropertyCondition && nextStep.name === "type") {
                const whereClause = parts.whereClause +
                    ' AND ' + parts.prefix + 'type = ' + this.addParameter(nextStep.value);
                return this.sqlWithConditions({
                    prefix: parts.prefix,
                    fromClause: parts.fromClause,
                    joins: parts.joins,
                    whereClause
                }, steps.slice(1));
            }
            else if (nextStep instanceof ExistentialCondition) {
                const existence = nextStep.quantifier === Quantifier.Exists ? 'EXISTS' : 'NOT EXISTS';
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
                return this.sqlWithConditions({
                    prefix: parts.prefix,
                    fromClause: parts.fromClause,
                    joins: parts.joins,
                    whereClause
                }, steps.slice(1));
            }
        }
    
        throw new Error("Cannot yet handle this query.");
    }

    private allocateAlias() {
        return 'e' + this.nextAlias++;
    }

    private addParameter(value: any) {
        this.parameters.push(value);
        return '$' + this.parameters.length;
    }
}
