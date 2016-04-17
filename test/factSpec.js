var mocha = require("mocha");
var chai = require("chai");
var Interface = require('../node/interface');

var expect = chai.expect;

describe ('Hash', function () {
    it ('should be an integer', function () {
        var fact = { real: Math.SQRT2 };
        var hash = Interface.computeHash(fact);
        expect(hash).to.equal(Math.floor(hash));
    });
    
    it ('should be a 32-bit number (strings)', function() {
        var hash = Interface.computeHash({
            type: "Jinaga.User",
            publicKey: "----BEGIN PUBLIC KEY---XXXXX"
        });
            
        expect(hash).to.be.below(Math.pow(2, 31));
        expect(hash).to.be.above(-Math.pow(2, 31));
    })
    
    it ('should be a 32-bit number (arrays)', function () {
        var range = function* (min, max) {
            for (var i = min; i < max; i++)
                yield i;
        };
        var predecessors = Array.from(range(0, 24)).map(function (i) {
            return { val: String.fromCharCode(65 + i, 66 + i, 67 + i) };
        });
        var hash = Interface.computeHash({ preds: predecessors });
        
        expect(hash).to.be.below(Math.pow(2, 31));
        expect(hash).to.be.above(-Math.pow(2, 31));
    });
    
    it ('should be independent of field order', function () {
        var hash1 = Interface.computeHash({
            a: 'one',
            b: 'two'
        });
        var hash2 = Interface.computeHash({
            b: 'two',
            a: 'one'
        });
        
        expect(hash1).to.equal(hash2);
    });
    
    it ('should be independent of array order', function () {
        var hash1 = Interface.computeHash({
            preds: [ { val: 'one' }, { val: 'two' } ]
        });
        var hash2 = Interface.computeHash({
            preds: [ { val: 'two' }, { val: 'one' } ]
        });
        
        expect(hash1).to.equal(hash2);
    });
})