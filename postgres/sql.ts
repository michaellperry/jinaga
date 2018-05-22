import { Direction, ExistentialCondition, Join, PropertyCondition, Quantifier, Step } from '../query/steps';
import { FactReference, factReferenceEquals } from '../storage';

export type SqlQuery = {
    sql: string,
    parameters: any[],
    pathLength: number
};

export function sqlFromSteps(start: FactReference, steps: Step[]) : SqlQuery {
    const builder = new QueryBuilder();

    return builder.buildQuery(start, steps);
}

type QueryParts = {
    prefixes: string[],
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
        //console.log(sql);
        //console.log(parameters);
        return { sql, parameters, pathLength: final.parts.prefixes.length };
    }

    private assembleQueryString(parts: QueryParts): string {
        const select = parts.prefixes.map((prefix, i) =>
            prefix + 'type AS type' + i + ', ' + prefix + 'hash AS hash' + i).join(', ');
        const sql = 'SELECT ' + select + ' ' +
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
            else if (step.direction === Direction.Predecessor) {
                return this.handleStartPredecessor(start, step.role);
            }
        }
        else if (step instanceof PropertyCondition && step.name === 'type') {
            return this.handleStartType(start, step.value);
        }
    
        throw new Error("Cannot yet handle this query: " + step.toDeclarativeString());
    }

    private handleStartSuccessor(start: FactReference, role: string): State {
        const alias = this.allocateAlias();
        const prefixes = [alias + '.successor_'];
        const fromClause = 'FROM public.edge ' + alias;
        const joins = '';
        const whereClause = alias + '.predecessor_type = ' + this.addParameter(start.type) +
            ' AND ' + alias + '.predecessor_hash = ' + this.addParameter(start.hash) +
            ' AND ' + alias + '.role = ' + this.addParameter(role);
        const parts = { prefixes, fromClause, joins, whereClause };

        return this.stateMatched(parts);
    }

    private handleStartPredecessor(start: FactReference, role: string): State {
        const alias = this.allocateAlias();
        const prefixes = [alias + '.predecessor_'];
        const fromClause = 'FROM public.edge ' + alias;
        const joins = '';
        const whereClause = alias + '.successor_type = ' + this.addParameter(start.type) +
            ' AND ' + alias + '.successor_hash = ' + this.addParameter(start.hash) +
            ' AND ' + alias + '.role = ' + this.addParameter(role);
        const parts = { prefixes, fromClause, joins, whereClause };

        return this.stateMatched(parts);
    }

    private handleStartType(start: FactReference, type: string): State {
        if (type === start.type) {
            return this.stateStart(start);
        }

        throw new Error("Type does not match: " + start.type + ' != ' + type);
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
    
        throw new Error("Cannot yet handle this query: " + step.toDeclarativeString());
    }

    private handleSubquerySuccessor(outerPrefix: string, role: string): State {
        const alias = this.allocateAlias();
        const fromClause = 'FROM public.edge ' + alias;
        const joins = '';
        const prefixes = [alias + '.successor_'];
        const whereClause = alias + '.predecessor_type = ' + outerPrefix + 'type' +
            ' AND ' + alias + '.predecessor_hash = ' + outerPrefix + 'hash' +
            ' AND ' + alias + '.role = ' + this.addParameter(role);
        const parts = { prefixes, fromClause, joins, whereClause };

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
        else if (step instanceof Join) {
            if (step.direction === Direction.Successor) {
                return this.handleMatchedSuccessor(parts, step.role);
            }
            else if (step.direction === Direction.Predecessor) {
                return this.handleMatchedPredecessor(parts, step.role);
            }
        }
        else if (step instanceof ExistentialCondition) {
            return this.handleMatchedExistentialCondition(parts, step.quantifier, step.steps);
        }

        throw new Error("Cannot yet handle this query: " + step.toDeclarativeString());
    }

    private handleMatchedType(parts: QueryParts, type: string): State {
        const prefix = parts.prefixes[parts.prefixes.length - 1];
        const whereClause = parts.whereClause +
            ' AND ' + prefix + 'type = ' + this.addParameter(type);
        return this.stateMatched({
            prefixes: parts.prefixes,
            fromClause: parts.fromClause,
            joins: parts.joins,
            whereClause
        });
    }

    private handleMatchedSuccessor(parts: QueryParts, role: string): State {
        const roleParameter = this.addParameter(role);
        const priorPrefix = parts.prefixes[parts.prefixes.length - 1];
        const alias = this.allocateAlias();
        const joins = parts.joins + ' JOIN public.edge ' + alias +
            ' ON ' + alias + '.predecessor_hash = ' + priorPrefix + 'hash' +
            ' AND ' + alias + '.predecessor_type = ' + priorPrefix + 'type';
        const whereClause = parts.whereClause + ' AND ' + alias + '.role = ' + roleParameter;
        const prefixes = parts.prefixes.concat([alias + '.successor_']);
        return this.stateMatched({
            prefixes,
            fromClause: parts.fromClause,
            joins,
            whereClause
        });
    }

    private handleMatchedPredecessor(parts: QueryParts, role: string): State {
        const roleParameter = this.addParameter(role);
        const priorPrefix = parts.prefixes[parts.prefixes.length - 1];
        const alias = this.allocateAlias();
        const joins = parts.joins + ' JOIN public.edge ' + alias +
            ' ON ' + alias + '.successor_hash = ' + priorPrefix + 'hash' +
            ' AND ' + alias + '.successor_type = ' + priorPrefix + 'type';
        const whereClause = parts.whereClause + ' AND ' + alias + '.role = ' + roleParameter;
        const prefixes = parts.prefixes.concat([alias + '.predecessor_']);
        return this.stateMatched({
            prefixes,
            fromClause: parts.fromClause,
            joins,
            whereClause
        });
    }

    private handleMatchedExistentialCondition(parts: QueryParts, quantifier: Quantifier, steps: Step[]): State {
        const existence = quantifier === Quantifier.Exists ? 'EXISTS' : 'NOT EXISTS';
        const prefix = parts.prefixes[parts.prefixes.length - 1];
        const childQuery = this.buildChildQuery(prefix, steps);
        const whereClause = parts.whereClause +
            ' AND ' + existence + ' (' + childQuery + ')';
        return this.stateMatched({
            prefixes: parts.prefixes,
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
