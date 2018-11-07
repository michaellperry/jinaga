import 'source-map-support/register';

import { expect } from 'chai';
import { describe, it } from 'mocha';

import { uniqueFactReferences } from '../../src/storage';

describe('Fact reference', () => {

    it('should find unique in empty list', () => {
        const unique = uniqueFactReferences([]);
        expect(unique.length).to.equal(0);
    });

    it('should find unique in singleton', () => {
        const unique = uniqueFactReferences([{type:'', hash:''}]);
        expect(unique.length).to.equal(1);
    });

    it('should find unique in double', () => {
        const unique = uniqueFactReferences([{type:'', hash:''}, {type:'', hash:''}]);
        expect(unique.length).to.equal(1);
    });

    it('should find unique in same type', () => {
        const unique = uniqueFactReferences([{type:'a', hash:''}, {type:'a', hash:''}]);
        expect(unique.length).to.equal(1);
    });

    it('should find unique in different type', () => {
        const unique = uniqueFactReferences([{type:'a', hash:''}, {type:'b', hash:''}]);
        expect(unique.length).to.equal(2);
    });

    it('should find unique in same hash', () => {
        const unique = uniqueFactReferences([{type:'a', hash:'x'}, {type:'a', hash:'x'}]);
        expect(unique.length).to.equal(1);
    });

    it('should find unique in different hash', () => {
        const unique = uniqueFactReferences([{type:'a', hash:'x'}, {type:'a', hash:'y'}]);
        expect(unique.length).to.equal(2);
    });

});