var chai = require("chai");
var Jinaga = require("../node/jinaga");
var Collections = require("../node/collections");

chai.should();
var expect = chai.expect;
var _isEqual = Collections._isEqual;

describe("Nested watch", function () {
    var j;
    var room;

    beforeEach(function () {
        j = new Jinaga();
        room = {
            type: 'Room'
        };
    });

    function messagesInRoom(r) {
        return {
            type: 'Message',
            room: r
        };
    }

    function namesOfSender(m) {
        m.has('sender');
        return {
            type: 'Name',
            person: m.sender
        };
    }

    function makeMessageViewModel(message) {
        return {
            message: message
        };
    }

    function setMessageFrom(vm, name) {
        vm.from = name;
    }

    it.only("can be expressed", function () {
        var watch = j.watch(room, [messagesInRoom], makeMessageViewModel)
            .watch([namesOfSender], setMessageFrom);
        watch.stop();
    })
});