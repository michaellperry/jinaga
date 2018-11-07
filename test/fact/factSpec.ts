import { expect } from 'chai';

import { computeHash } from '../../src/fact/hash';

describe ('Hash', function () {
    it ('should be independent of field order', function () {
        const hash1 = computeHash({
            a: 'one',
            b: 'two'
        }, {});
        const hash2 = computeHash({
            b: 'two',
            a: 'one'
        }, {});
        
        expect(hash1).to.equal(hash2);
    });
    
    it ('should be independent of array order', function () {
        const one = {
            type: 'pred', hash: 'one'
        };
        const two = {
            type: 'pred', hash: 'two'
        };
        const hash1 = computeHash({}, {
            preds: [ one, two ]
        });
        const hash2 = computeHash({}, {
            preds: [ two, one ]
        });
        
        expect(hash1).to.equal(hash2);
    });
})