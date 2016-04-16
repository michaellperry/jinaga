var mocha = require('mocha');
var chai = require('chai');
var FactChannel = require('../node/factChannel');

var should = chai.should();

describe('protocol', function () {
    it('should serialize one fact', function () {
        var messages = [];
        var channel = new FactChannel(function (message) {
            messages.push(message);
        });
        channel.send({
            type: "Jinaga.User",
            publicKey: "----BEGIN PUBLIC KEY---XXXXX"
        });
        should.equal(1, messages.length);
        should.equal('{"id":1,"fact":{"type":"Jinaga.User","publicKey":"----BEGIN PUBLIC KEY---XXXXX"}}',
            messages[0]);
    });
});