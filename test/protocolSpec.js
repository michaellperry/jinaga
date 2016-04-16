var mocha = require('mocha');
var chai = require('chai');
var FactChannel = require('../node/factChannel');

var should = chai.should();

describe('protocol', function () {
    var messages;
    var channel;
    
    beforeEach(function () {
        messages = [];
        channel = new FactChannel(function (message) {
            messages.push(message);
        });
    });
    
    it('should serialize one fact', function () {
        channel.sendFact({
            type: "Jinaga.User",
            publicKey: "----BEGIN PUBLIC KEY---XXXXX"
        });
        
        should.equal(1, messages.length);
        should.equal(
            '{"type":"fact","id":1,"fact":{"type":"Jinaga.User","publicKey":"----BEGIN PUBLIC KEY---XXXXX"}}',
            messages[0]);
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
        
        should.equal(2, messages.length);
        should.equal(
            '{"type":"fact","id":1,"fact":{"type":"Jinaga.User","publicKey":"----BEGIN PUBLIC KEY---XXXXX"}}',
            messages[0]);
        should.equal(
            '{"type":"fact","id":3,"fact":{"type":"List","name":"Chores","from":{"id":1}}}',
            messages[1]);
    });
});