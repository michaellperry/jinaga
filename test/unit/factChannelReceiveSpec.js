var mocha = require('mocha');
var chai = require('chai');
var FactChannel = require('../../node/distributor/factChannel').FactChannel;

var expect = chai.expect;

describe ('FactChannel receive', function () {
    var channel;
    var facts;
    
    beforeEach(function () {
        facts = [];
        channel = new FactChannel(2, function (message) {
            // Message to send
        }, function (fact) {
            facts.push(fact);
        });
    });
    
    it ('should read one fact', function () {
        channel.messageReceived({
            type: "fact",
            id: 1,
            fact:{
                type: "Jinaga.User",
                publicKey: "----BEGIN PUBLIC KEY---XXXXX"
            }
        });
        
        expect(facts.length).to.equal(1);
        expect(facts[0].type).to.equal("Jinaga.User");
    });
    
    it ('should read a predecessor', function () {
        channel.messageReceived({
            type: "fact",
            id: 1,
            fact:{
                type: "Jinaga.User",
                publicKey: "----BEGIN PUBLIC KEY---XXXXX"
            }
        });
        channel.messageReceived({
            type: "fact",
            id: 3,
            fact:{
                type: "List",
                name: "Chores",
                from: {
                    id: 1,
                    hash: -1902729049
                }
            }
        });
        
        expect(facts.length).to.equal(2);
        expect(facts[0]).to.eql({
            type: "Jinaga.User",
            publicKey: "----BEGIN PUBLIC KEY---XXXXX"
        });
        expect(facts[1]).to.eql({
            type: "List",
            name: "Chores",
            from: {
                type: "Jinaga.User",
                publicKey: "----BEGIN PUBLIC KEY---XXXXX"
            }
        });
    });
    
    it ('shoud read a set of predecessors', function () {
        channel.messageReceived({
            type: "fact",
            id: 1,
            fact: {
                value: "b"
            }
        });
        channel.messageReceived({
            type: "fact",
            id: 3,
            fact: {
                value: "c"
            }
        });
        channel.messageReceived({
            type: "fact",
            id: 5,
            fact: {
                value: "a",
                prior: [{
                    id: 1,
                    hash: -823812847
                }, {
                    id: 3,
                    hash: -823812846
                }]
            }
        });
        
        expect(facts.length).to.equal(3);
        expect(facts[0]).to.eql({
            value: "b"
        });
        expect(facts[1]).to.eql({
            value: "c"
        });
        expect(facts[2]).to.eql({
            value: "a",
            prior: [{
                value: "b"
            }, {
                value: "c"
            }]
        });
    });
    
    it ('should reuse predecessors', function () {
        channel.messageReceived({
            type: "fact",
            id: 1,
            fact: {
                value: "top"
            }
        });
        channel.messageReceived({
            type: "fact",
            id: 3,
            fact: {
                value: "first",
                parent: {
                    id: 1,
                    hash: -823697916
                }
            }
        });
        channel.messageReceived({
            type: "fact",
            id: 5,
            fact: {
                value: "second",
                parent: {
                    id: 1,
                    hash: -823697916
                }
            }
        });
        
        expect(facts.length).to.equal(3);
        expect(facts[0]).to.eql({
            value: "top"
        });
        expect(facts[1]).to.eql({
            value: "first",
            parent: {
                value: "top"
            }
        });
        expect(facts[2]).to.eql({
            value: "second",
            parent: {
                value: "top"
            }
        });
    });
    
    it ('should accept reused id', function () {
        channel.sendFact({
            type: "Jinaga.User",
            publicKey: "----BEGIN PUBLIC KEY---XXXXX"
        });
        channel.messageReceived({
            type: "fact",
            id: 1,
            fact:{
                type: "List",
                name: "Chores",
                from: {
                    id: 2,
                    hash: -1902729049
                }
            }
        });
        
        expect(facts.length).to.equal(1);
        expect(facts[0]).to.eql({
            type: "List",
            name: "Chores",
            from: {
                type: "Jinaga.User",
                publicKey: "----BEGIN PUBLIC KEY---XXXXX"
            }
        });
    });
    
    it ('should accept either of duplicate ids', function () {
        channel.sendFact({
            type: "Jinaga.User",
            publicKey: "----BEGIN PUBLIC KEY---XXXXX"
        });
        channel.messageReceived({
            type: "fact",
            id: 1,
            fact:{
                type: "Jinaga.User",
                publicKey: "----BEGIN PUBLIC KEY---XXXXX"
            }
        });
        channel.messageReceived({
            type: "fact",
            id: 3,
            fact:{
                type: "List",
                name: "Chores",
                from: {
                    id: 2,
                    hash: -1902729049
                }
            }
        });
        
        expect(facts.length).to.equal(2);
        expect(facts[1]).to.eql({
            type: "List",
            name: "Chores",
            from: {
                type: "Jinaga.User",
                publicKey: "----BEGIN PUBLIC KEY---XXXXX"
            }
        });
    });
});