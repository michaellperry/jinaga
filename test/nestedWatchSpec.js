var chai = require("chai");
var Jinaga = require("../node/jinaga");
var Collections = require("../node/collections");

chai.should();
var expect = chai.expect;
var _isEqual = Collections._isEqual;

describe("Nested watch", function () {
    var j;
    var room;
    var messageViewModels;

    beforeEach(function () {
        j = new Jinaga();
        room = {
            type: 'Room'
        };
        messageViewModels = [];
    });

    function messagesInRoom(r) {
        return {
            type: 'Message',
            room: r
        };
    }

    function namesOfSender(m) {
        m.has('sender');
        m.sender.type = 'Person';
        return {
            type: 'Name',
            person: m.sender
        };
    }

    function makeMessageViewModel(message) {
        var vm = {
            message: message
        };
        messageViewModels.push(vm);
        //console.log('-- Received message: ' + JSON.stringify(message));
        return vm;
    }

    function setMessageFrom(vm, name) {
        //console.log('-- Set name for ' + JSON.stringify(vm) + ': ' + JSON.stringify(name));
        vm.from = name.value;
    }

    it("can be expressed", function () {
        var watch = startWatch();
        watch.stop();
    });

    it("should find existing fact", function () {
        var person = addPerson();
        setName(person);
        addMessage(person);
        var watch = startWatch();
        expectState();

        watch.stop();
    });

    it("should find new facts", function () {
        var watch = startWatch();
        var person = addPerson();
        setName(person);
        addMessage(person);
        expectState();

        watch.stop();
    });

    it("should find new facts in other order", function () {
        var watch = startWatch();
        var person = addPerson();
        addMessage(person);
        setName(person);
        expectState();

        watch.stop();
    });

    it("should not find facts after stopped", function () {
        var watch = startWatch();
        var person = addPerson();
        addMessage(person);
        watch.stop();
        setName(person);
        expectOriginalState();
    });

    it("should stop child", function () {
        var messages = j.watch(room, [messagesInRoom], makeMessageViewModel);
        var names = messages.watch([namesOfSender], setMessageFrom);
        names.stop();

        var person = addPerson();
        addMessage(person);
        setName(person);
        expectOriginalState();

        messages.stop();
    })

    function addPerson() {
        var person = {
            type: 'Person'
        };
        j.fact(person);
        return person;
    }

    function setName(person) {
        j.fact({
            type: 'Name',
            person: person,
            value: 'George'
        });
    }

    function addMessage(person) {
        j.fact({
            type: 'Message',
            room: room,
            sender: person
        });
    }

    function startWatch() {
        var messages = j.watch(room, [messagesInRoom], makeMessageViewModel);
        messages.watch([namesOfSender], setMessageFrom);
        return messages;
    }

    function expectState() {
        expect(messageViewModels.length).to.equal(1);
        expect(messageViewModels[0].from).to.equal('George');
    }

    function expectOriginalState() {
        expect(messageViewModels.length).to.equal(1);
        expect(messageViewModels[0].from).to.equal(undefined);
    }
});