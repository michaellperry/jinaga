var chai = require("chai");
var Jinaga = require("../node/jinaga");
var Collections = require("../node/utility/collections");

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

    function messageRemoved(m) {
        return {
            type: 'Removed',
            message: m
        };
    }

    function messagesInRoom(r) {
        return j.where({
            type: 'Message',
            room: r
        }, [j.not(messageRemoved)]);
    }

    function nameIsCurrent(n) {
        return j.not({
            type: 'Name',
            prior: n
        });
    }

    function namesOfSender(m) {
        m.has('sender');
        m.sender.type = 'Person';
        return j.where({
            type: 'Name',
            person: m.sender
        }, [nameIsCurrent]);
    }

    function makeMessageViewModel(message) {
        var vm = {
            message: message,
            from: []
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
        vm.from.push(name.value);
        return {
            vm: vm,
            prior: name.value
        };
    }

    function removeMessageFrom(setting) {
        var index = setting.vm.from.indexOf(setting.prior);
        if (index >= 0)
            setting.vm.from.splice(index, 1);
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
        expectName('George');

        watch.stop();
    });

    it("should find new facts", function () {
        var watch = startWatch();
        var person = addPerson();
        setName(person, 'George');
        addMessage(person);
        expectName('George');

        watch.stop();
    });

    it("should find new facts in other order", function () {
        var watch = startWatch();
        var person = addPerson();
        addMessage(person);
        setName(person, 'George');
        expectName('George');

        watch.stop();
    });

    it("should not find facts after stopped", function () {
        var watch = startWatch();
        var person = addPerson();
        addMessage(person);
        watch.stop();
        setName(person, 'George');
        expectName(undefined);
    });

    it("should stop child", function () {
        var messages = j.watch(room, [messagesInRoom], makeMessageViewModel);
        var names = messages.watch([namesOfSender], setMessageFrom, removeMessageFrom);
        names.stop();

        var person = addPerson();
        addMessage(person);
        setName(person, 'George');
        expectName(undefined);

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

    it("should replace names", function () {
        var person = addPerson();
        var name = setName(person, 'George');
        addMessage(person);
        var watch = startWatch();
        setName(person, 'John', [name]);
        expectName('John');

        watch.stop();
    })

    function addPerson() {
        return j.fact({
            type: 'Person',
            identifier: Math.random()
        });
    }

    function setName(person, value, prior) {
        return j.fact({
            type: 'Name',
            person: person,
            value: value,
            prior: prior || []
        });
    }

    function addMessage(person) {
        return j.fact({
            type: 'Message',
            room: room,
            sender: person,
            identifier: Math.random()
        });
    }

    function removeMessage(message) {
        return j.fact({
            type: 'Removed',
            message: message
        });
    }

    function startWatch() {
        var messages = j.watch(room, [messagesInRoom], makeMessageViewModel, removeMessageViewModel);
        messages.watch([namesOfSender], setMessageFrom, removeMessageFrom);
        return messages;
    }

    function expectName(name) {
        expect(messageViewModels.length).to.equal(1);
        if (name) {
            expect(messageViewModels[0].from.length).to.equal(1);
            expect(messageViewModels[0].from[0]).to.equal(name);
        }
        else {
            expect(messageViewModels[0].from.length).to.equal(0);
        }
    }

    function expectNoMessages() {
        expect(messageViewModels.length).to.equal(0);
    }
});