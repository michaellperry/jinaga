import { Direction, Join, PropertyCondition, Step } from '../query/steps';
import { FactReference } from '../storage';

export type SqlQuery = {
    sql: string,
    parameters: any[]
};

export function sqlFromSteps(start: FactReference, steps: Step[]) : SqlQuery {
    if (steps.length >= 1) {
        const firstStep = steps[0];
        if (firstStep instanceof Join) {
            if (firstStep.direction === Direction.Successor) {
                 return assembleQuery(sqlFromSuccessor(start, firstStep.role, steps.slice(1)));
            }
        }
    }

    throw new Error("Cannot yet handle this query.");
}

type QueryParts = {
    typeColumn: string,
    hashColumn: string,
    joins: string,
    whereClause: string,
    parameters: any[]
};

function assembleQuery(parts: QueryParts): SqlQuery {
    const sql = 'SELECT ' + parts.typeColumn + ' AS type, ' + parts.hashColumn + ' AS hash ' +
        'FROM public.edge e1 ' + parts.joins + ' WHERE ' + parts.whereClause;
    const parameters = parts.parameters;
    return { sql, parameters };
}

function sqlFromSuccessor(start: FactReference, role: string, steps: Step[]): QueryParts {
    const typeColumn = 'e1.successor_type';
    const hashColumn = 'e1.successor_hash';
    const joins = '';
    let whereClause = 'e1.predecessor_type = $1 AND e1.predecessor_hash = $2 AND e1.role = $3';
    let parameters = [ start.type, start.hash, role ];
    if (steps.length === 0) {
        return { typeColumn, hashColumn, joins, whereClause, parameters };
    }
    else {
        const nextStep = steps[0];
        if (nextStep instanceof PropertyCondition && nextStep.name === "type") {
            const type = nextStep.value;
            whereClause = whereClause + ' AND e1.successor_type = $4';
            parameters = parameters.concat(type);
            return { typeColumn, hashColumn, joins, whereClause, parameters };
        }
    }

    throw new Error("Cannot yet handle this query.");
}