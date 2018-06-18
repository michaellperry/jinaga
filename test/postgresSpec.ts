import 'source-map-support/register';

import { expect } from 'chai';
import { describe, it } from 'mocha';

import { dehydrateReference } from '../src/fact/hydrate';
import { sqlFromSteps } from '../src/postgres/sql';
import { fromDescriptiveString } from '../src/query/descriptive-string';

describe('Postgres', () => {

  const start = dehydrateReference({ type: 'Root' });
  const startHash = 'fSS1hK7OGAeSX4ocN3acuFF87jvzCdPN3vLFUtcej0lOAsVV859UIYZLRcHUoMbyd/J31TdVn5QuE7094oqUPg==';

  function sqlFor(descriptiveString: string) {
    const query = fromDescriptiveString(descriptiveString);
    const sqlQuery = sqlFromSteps(start, query.steps);
    return sqlQuery;
  }

  it('should parse empty query', () => {
    expect(sqlFor('')).to.equal(null);
  });

  it('should parse successor query', () => {
    const { sql, parameters, pathLength } = sqlFor('S.child');
    expect(sql).to.equal(
      'SELECT e1.successor_type AS type0, e1.successor_hash AS hash0 ' +
      'FROM public.edge e1  ' +
      'WHERE e1.predecessor_type = $1 AND e1.predecessor_hash = $2 AND e1.role = $3'
    );
    expect(parameters[0]).to.equal('Root');
    expect(parameters[1]).to.equal(startHash);
    expect(parameters[2]).to.equal('child');
    expect(pathLength).to.equal(1);
  });

  it('should parse predecessor query', () => {
    const { sql, parameters, pathLength } = sqlFor('P.parent');
    expect(sql).to.equal(
      'SELECT e1.predecessor_type AS type0, e1.predecessor_hash AS hash0 ' +
      'FROM public.edge e1  ' +
      'WHERE e1.successor_type = $1 AND e1.successor_hash = $2 AND e1.role = $3'
    );
    expect(parameters[0]).to.equal('Root');
    expect(parameters[1]).to.equal(startHash);
    expect(parameters[2]).to.equal('parent');
    expect(pathLength).to.equal(1);
  });

  it('should parse successor query with type', () => {
    const { sql, parameters, pathLength } = sqlFor('S.child F.type="Child"');
    expect(sql).to.equal(
      'SELECT e1.successor_type AS type0, e1.successor_hash AS hash0 ' +
      'FROM public.edge e1  ' +
      'WHERE e1.predecessor_type = $1 AND e1.predecessor_hash = $2 AND e1.role = $3 ' +
        'AND e1.successor_type = $4'
    );
      expect(parameters[0]).to.equal('Root');
      expect(parameters[1]).to.equal(startHash);
      expect(parameters[2]).to.equal('child');
      expect(parameters[3]).to.equal('Child');
      expect(pathLength).to.equal(1);
  });

  it('should parse predecessor query with type', () => {
    const { sql, parameters, pathLength } = sqlFor('P.parent F.type="Parent"');
    expect(sql).to.equal(
      'SELECT e1.predecessor_type AS type0, e1.predecessor_hash AS hash0 ' +
      'FROM public.edge e1  ' +
      'WHERE e1.successor_type = $1 AND e1.successor_hash = $2 AND e1.role = $3 ' +
        'AND e1.predecessor_type = $4'
    );
    expect(parameters[0]).to.equal('Root');
    expect(parameters[1]).to.equal(startHash);
    expect(parameters[2]).to.equal('parent');
    expect(parameters[3]).to.equal('Parent');
    expect(pathLength).to.equal(1);
  });

  it('should parse successor query with existential', () => {
    const { sql, parameters, pathLength } = sqlFor('S.child E(S.grandchild)');
    expect(sql).to.equal(
      'SELECT e1.successor_type AS type0, e1.successor_hash AS hash0 ' +
      'FROM public.edge e1  ' +
      'WHERE e1.predecessor_type = $1 AND e1.predecessor_hash = $2 AND e1.role = $3 ' +
        'AND EXISTS (SELECT 1 ' +
          'FROM public.edge e2  ' +
          'WHERE e2.predecessor_type = e1.successor_type AND e2.predecessor_hash = e1.successor_hash ' +
            'AND e2.role = $4)'
    );
      expect(parameters[0]).to.equal('Root');
      expect(parameters[1]).to.equal(startHash);
      expect(parameters[2]).to.equal('child');
      expect(parameters[3]).to.equal('grandchild');
      expect(pathLength).to.equal(1);
  });

  it('should parse successor query with negative existential', () => {
    const { sql, parameters, pathLength } = sqlFor('S.child N(S.grandchild)');
    expect(sql).to.equal(
      'SELECT e1.successor_type AS type0, e1.successor_hash AS hash0 ' +
      'FROM public.edge e1  ' +
      'WHERE e1.predecessor_type = $1 AND e1.predecessor_hash = $2 AND e1.role = $3 ' +
        'AND NOT EXISTS (SELECT 1 ' +
          'FROM public.edge e2  ' +
          'WHERE e2.predecessor_type = e1.successor_type AND e2.predecessor_hash = e1.successor_hash ' +
            'AND e2.role = $4)'
    );
      expect(parameters[0]).to.equal('Root');
      expect(parameters[1]).to.equal(startHash);
      expect(parameters[2]).to.equal('child');
      expect(parameters[3]).to.equal('grandchild');
      expect(pathLength).to.equal(1);
  });

  it('should parse successor query with existential predecessor', () => {
    const { sql, parameters, pathLength } = sqlFor('S.child E(P.uncle)');
    expect(sql).to.equal(
      'SELECT e1.successor_type AS type0, e1.successor_hash AS hash0 ' +
      'FROM public.edge e1  ' +
      'WHERE e1.predecessor_type = $1 AND e1.predecessor_hash = $2 AND e1.role = $3 ' +
        'AND EXISTS (SELECT 1 ' +
          'FROM public.edge e2  ' +
          'WHERE e2.successor_type = e1.successor_type AND e2.successor_hash = e1.successor_hash ' +
            'AND e2.role = $4)'
    );
      expect(parameters[0]).to.equal('Root');
      expect(parameters[1]).to.equal(startHash);
      expect(parameters[2]).to.equal('child');
      expect(parameters[3]).to.equal('uncle');
      expect(pathLength).to.equal(1);
  });

  it('should parse successor query with negative existential predecessor', () => {
    const { sql, parameters, pathLength } = sqlFor('S.child N(P.uncle)');
    expect(sql).to.equal(
      'SELECT e1.successor_type AS type0, e1.successor_hash AS hash0 ' +
      'FROM public.edge e1  ' +
      'WHERE e1.predecessor_type = $1 AND e1.predecessor_hash = $2 AND e1.role = $3 ' +
        'AND NOT EXISTS (SELECT 1 ' +
          'FROM public.edge e2  ' +
          'WHERE e2.successor_type = e1.successor_type AND e2.successor_hash = e1.successor_hash ' +
            'AND e2.role = $4)'
    );
      expect(parameters[0]).to.equal('Root');
      expect(parameters[1]).to.equal(startHash);
      expect(parameters[2]).to.equal('child');
      expect(parameters[3]).to.equal('uncle');
      expect(pathLength).to.equal(1);
  });

});