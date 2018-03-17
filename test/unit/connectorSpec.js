var chai = require("chai");
var Jinaga = require("../../node/jinaga");
var JinagaDistributor = require("../../node/jinaga.distributor.server");
var MemoryProvider = require("../../node/memory");
var JinagaConnector = require("../../node/connector");

var expect = chai.expect;

function factsInRoot(r) {
    return {
        root: r
    };
}

describe("Connector", function () {
    var j1, j2;
    var distributor;
    
    beforeEach(function () {
        j1 = new Jinaga();
        j2 = new Jinaga();
        distributor = new JinagaDistributor(new MemoryProvider(), new MemoryProvider(), null);
        
        j1.sync(new JinagaConnector(distributor));
        j2.sync(new JinagaConnector(distributor));
    });
    
    it("should watch existing facts", function () {
        var facts = [];
        
        j1.fact({
            root: {},
            value: 17
        });
        
        var watch = j2.watch({}, [factsInRoot], function (fact) {
            facts.push(fact);
        });
        
        watch.stop();
        
        expect(facts.length).to.equal(1);
        expect(facts[0].value).to.equal(17);
    });
    
    it("should query existing facts", function () {
        var facts = null;
        
        j1.fact({
            root: {},
            value: 17
        });
        
        j2.query({}, [factsInRoot], function (results) {
            facts = results;
        });
        
        expect(facts).to.not.be.null;
        expect(facts.length).to.equal(1);
        expect(facts[0].value).to.equal(17);
    });
    
    it("should transmit a fact to the other container", function () {
        var facts = [];
        
        var watch = j2.watch({}, [factsInRoot], function (fact) {
            facts.push(fact);
        });
        var subscription = j2.subscribe({}, [factsInRoot]);
        
        j1.fact({
            root: {},
            value: 17
        });
        
        watch.stop();
        subscription.stop();
        
        expect(facts.length).to.equal(1);
        expect(facts[0].value).to.equal(17);
    });
    
    it("should not transmit facts that do not match", function () {
        var facts = [];
        
        var watch = j2.watch({ match: "not" }, [factsInRoot], function (fact) {
            facts.push(fact);
        });
        var subscription = j2.subscribe({}, [factsInRoot]);
        
        j1.fact({
            root: {},
            value: 17
        });
        
        watch.stop();
        subscription.stop();
        
        expect(facts.length).to.equal(0);
    })
    
    it("should stop watching", function () {
        var facts = [];
        
        var watch = j2.watch({}, [factsInRoot], function (fact) {
            facts.push(fact);
        });
        var subscription = j2.subscribe({}, [factsInRoot]);
        
        subscription.stop();
        
        j1.fact({
            root: {},
            value: 17
        });

        watch.stop();

        expect(facts.length).to.equal(0);
    });
});