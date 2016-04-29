var mocha = require('mocha');
var chai = require('chai');
var FactChannel = require('../node/factChannel');

var expect = chai.expect;

describe('FactChannel send', function () {
    var messages;
    var channel;
    
    beforeEach(function () {
        messages = [];
        channel = new FactChannel(1, function (message) {
            messages.push(message);
        }, function (fact) {
            // Fact received.
        });
    });
    
    it('should serialize one fact', function () {
        channel.sendFact({
            type: "Jinaga.User",
            publicKey: "----BEGIN PUBLIC KEY---XXXXX"
        });
        
        expect(messages.length).to.equal(1);
        expect(messages[0]).to.eql({
            type: "fact",
            id: 1,
            fact:{
                type: "Jinaga.User",
                publicKey: "----BEGIN PUBLIC KEY---XXXXX"
            }
        });
    });
    
    it('should serialize a predecessor', function () {
        channel.sendFact({
            type: "List",
            name: "Chores",
            from: {
                type: "Jinaga.User",
                publicKey: "----BEGIN PUBLIC KEY---XXXXX"
            }
        });
        
        expect(messages.length).to.equal(2);
        expect(messages[0]).to.eql({
            type: "fact",
            id: 1,
            fact:{
                type: "Jinaga.User",
                publicKey: "----BEGIN PUBLIC KEY---XXXXX"
            }
        });
        expect(messages[1]).to.eql({
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
    });
    
    it('should serialize a set of predecessors', function () {
        channel.sendFact({
            value: "a",
            prior: [{
                value: "b"
            }, {
                value: "c"
            }]
        });
        
        expect(messages.length).to.equal(3);
        expect(messages[0]).to.eql({
            type: "fact",
            id: 1,
            fact: {
                value: "b"
            }
        });
        expect(messages[1]).to.eql({
            type: "fact",
            id: 3,
            fact: {
                value: "c"
            }
        });
        expect(messages[2]).to.eql({
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
    });
    
    it('should reuse predecessors', function () {
        channel.sendFact({
            value: "first",
            parent: {
                value: "top"
            }
        });
        channel.sendFact({
            value: "second",
            parent: {
                value: "top"
            }
        });
        
        expect(messages.length).to.equal(3);
        expect(messages[0]).to.eql({
            type: "fact",
            id: 1,
            fact: {
                value: "top"
            }
        });
        expect(messages[1]).to.eql({
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
        expect(messages[2]).to.eql({
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
    });
    
    it('should reuse id', function () {
        channel.messageReceived({
            type: "fact",
            id: 2,
            fact: {
                type: "Jinaga.User",
                publicKey: "----BEGIN PUBLIC KEY---XXXXX"
            }
        });
        channel.sendFact({
            type: "List",
            name: "Chores",
            from: {
                type: "Jinaga.User",
                publicKey: "----BEGIN PUBLIC KEY---XXXXX"
            }
        });
        
        expect(messages.length).to.equal(1);
        expect(messages[0]).to.eql({
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
    });
    
    it('should choose among duplicate ids', function () {
        channel.sendFact({
            type: "Jinaga.User",
            publicKey: "----BEGIN PUBLIC KEY---XXXXX"
        });
        channel.messageReceived({
            type: "fact",
            id: 2,
            fact: {
                type: "Jinaga.User",
                publicKey: "----BEGIN PUBLIC KEY---XXXXX"
            }
        });
        channel.sendFact({
            type: "List",
            name: "Chores",
            from: {
                type: "Jinaga.User",
                publicKey: "----BEGIN PUBLIC KEY---XXXXX"
            }
        });
        
        expect(messages.length).to.equal(2);
        expect(messages[1]).to.eql({
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
    });
});