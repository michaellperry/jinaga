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
            type: 'Room',
            identifier: Math.random()
        };
        messageViewModels = [];
    });

    function messageExists(m) {
        return j.not({
            type: 'Removed',
            message: m
        });
    }

    function messagesInRoom(r) {
        return j.where({
            type: 'Message',
            room: r
        }, [messageExists]);
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

    function removeMessageViewModel(vm) {
        //console.log('-- Removed message: ' + JSON.stringify(vm.message));
        var index = messageViewModels.indexOf(vm);
        if (index >= 0) {
            messageViewModels.splice(index, 1);
        }
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
        setName(person, 'George');
        addMessage(person);
        var watch = startWatch();
        expectState('George');

        watch.stop();
    });

    it("should find new facts", function () {
        var watch = startWatch();
        var person = addPerson();
        setName(person, 'George');
        addMessage(person);
        expectState('George');

        watch.stop();
    });

    it("should find new facts in other order", function () {
        var watch = startWatch();
        var person = addPerson();
        addMessage(person);
        setName(person, 'George');
        expectState('George');

        watch.stop();
    });

    it("should not find facts after stopped", function () {
        var watch = startWatch();
        var person = addPerson();
        addMessage(person);
        watch.stop();
        setName(person, 'George');
        expectState(undefined);
    });

    it("should stop child", function () {
        var messages = j.watch(room, [messagesInRoom], makeMessageViewModel);
        var names = messages.watch([namesOfSender], setMessageFrom);
        names.stop();

        var person = addPerson();
        addMessage(person);
        setName(person, 'George');
        expectState(undefined);

        messages.stop();
    });

    it("should remove messages", function () {
        var person = addPerson();
        setName(person, 'George');
        var message = addMessage(person);
        var watch = startWatch();
        removeMessage(message);
        expectNoMessages();

        watch.stop();
    });

    function addPerson() {
        var person = {
            type: 'Person',
            identifier: Math.random()
        };
        j.fact(person);
        return person;
    }

    function setName(person, value) {
        j.fact({
            type: 'Name',
            person: person,
            value: value
        });
    }

    function addMessage(person) {
        var message = {
            type: 'Message',
            room: room,
            sender: person,
            identifier: Math.random()
        };
        j.fact(message);
        return message;
    }

    function removeMessage(message) {
        j.fact({
            type: 'Removed',
            message: message
        });
    }

    function startWatch() {
        var messages = j.watch(room, [messagesInRoom], makeMessageViewModel, removeMessageViewModel);
        messages.watch([namesOfSender], setMessageFrom);
        return messages;
    }

    function expectState(name) {
        expect(messageViewModels.length).to.equal(1);
        expect(messageViewModels[0].from).to.equal(name);
    }

    function expectNoMessages() {
        expect(messageViewModels.length).to.equal(0);
    }
});