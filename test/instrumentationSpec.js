var chai = require("chai");
var Jinaga = require("../node/jinaga");

var expect = chai.expect;

describe('Instrumentation', function () {

    var chores = {
        name: 'Chores'
    };

    function tasksInList(l) {
        return {
            list: l
        };
    }

    function completionsOfTask(t) {
        return {
            task: t
        };
    }

    function taskAdded(t) {
    }

    function taskCompleted(c) {
    }

    function Collector() {
        this.watchCount = 0;

        this.setCounter = function (name, count) {
            if (name === 'watches') {
                this.watchCount = count;
            }
        }
    }

    it('should count root watches', function () {
        var j = new Jinaga();
        var collector = new Collector();

        j.instrument(collector);
        j.watch(chores, [tasksInList], taskAdded);

        expect(collector.watchCount).to.equal(1);
    });

    it('should count child watches', function () {
        var j = new Jinaga();
        var collector = new Collector();
        var w;

        j.instrument(collector);
        w = j.watch(chores, [tasksInList], taskAdded);
        w.watch([completionsOfTask], taskCompleted);

        expect(collector.watchCount).to.equal(2);
    });

    it('should reduce count when child is removed', function () {
        var j = new Jinaga();
        var collector = new Collector();
        var w, c;

        j.instrument(collector);
        w = j.watch(chores, [tasksInList], taskAdded);
        c = w.watch([completionsOfTask], taskCompleted);
        c.stop();

        expect(collector.watchCount).to.equal(1);
    })

    it('should reduce count when root is removed', function () {
        var j = new Jinaga();
        var collector = new Collector();
        var w;

        j.instrument(collector);
        w = j.watch(chores, [tasksInList], taskAdded);
        w.watch([completionsOfTask], taskCompleted);
        w.stop();

        expect(collector.watchCount).to.equal(0);
    });
});