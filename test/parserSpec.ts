import { expect } from 'chai';
import { describe, it } from 'mocha';

import { parseQuery } from '../src/query/query-parser';

describe('Addition', () => {
    it('should be correct', () => {
        expect(2+2).to.equal(4);
    })
});

describe('Query parser', () => {
    it('should exist', () => {
        expect(parseQuery).not.to.be.null;
    })
});