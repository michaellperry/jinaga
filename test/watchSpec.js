var chai = require("chai");
var Jinaga = require("../node/jinaga");
var Collections = require("../node/collections");

chai.should();
var expect = chai.expect;
var _isEqual = Collections._isEqual;

describe("Watch", function () {
  var j;
  beforeEach(function() {
    j = new Jinaga();
    tasks = [];
  });

  var chores = {
    name: "Chores"
  };

  var trash = {
    list: chores,
    description: "Take out the trash"
  };

  function tasksInList(l) {
    return j.where({
      list: l
    }, [j.not(isCompleted)]);
  }

  function isCompleted(t) {
    return {
      type: "Completed",
      task: t
    };
  }

  var tasks;
  function taskAdded(task) {
    tasks.push(task);
    return {
      task: task
    }
  }

  function taskRemoved(mapping) {
    var index = tasks.indexOf(mapping.task);
    if (index >= 0)
      tasks.splice(index, 1);
  }

  it("should return a matching message", function () {
    j.watch(chores, [tasksInList], taskAdded);
    j.fact(trash);

    tasks.length.should.equal(1);
    expect(_isEqual(tasks[0], trash)).to.be.true;
  });

  it("should not return a match twice", function () {
    j.watch(chores, [tasksInList], taskAdded);
    j.fact(trash);
    j.fact(trash);

    tasks.length.should.equal(1);
  });

  it("should not return if not a match", function () {
    j.watch(chores, [tasksInList], taskAdded);
    j.fact({
      list: {
        name: "Fun"
      },
      description: "Play XBox"
    });

    tasks.length.should.equal(0);
  });

  it("should return existing message", function () {
    j.fact(trash);
    j.watch(chores, [tasksInList], taskAdded);

    tasks.length.should.equal(1);
    expect(_isEqual(tasks[0], trash)).to.be.true;
  });

  it("should match a predecessor", function () {
    j.watch(chores, [tasksInList], taskAdded);
    j.fact({
      type: "TaskCompletion",
      task: trash
    });

    tasks.length.should.equal(1);
    expect(_isEqual(tasks[0], trash)).to.be.true;
  })

  it("should stop watching", function () {
    var watch = j.watch(chores, [tasksInList], taskAdded);
    watch.stop();
    j.fact(trash);

    tasks.length.should.equal(0);
  });

  it("should query existing message", function (done) {
    j.fact(trash);
    j.query(chores, [tasksInList], function (results) {
      results.length.should.equal(1);
      expect(_isEqual(results[0], trash)).to.be.true;
      done();
    });
  });

  it ("should remove a fact when a successor is added", function () {
    var watch = j.watch(chores, [tasksInList], taskAdded, taskRemoved);
    j.fact(trash);
    j.fact({ type: "Completed", task: trash });
    expect(tasks.length).to.equal(0);
    watch.stop();
  });

  it ("should remove an existing fact when a successor is added", function () {
    j.fact(trash);
    var watch = j.watch(chores, [tasksInList], taskAdded, taskRemoved);
    j.fact({ type: "Completed", task: trash });
    expect(tasks.length).to.equal(0);
    watch.stop();
  });

  it ("should remove a fact when a successor is added via array", function () {
    var watch = j.watch(chores, [tasksInList], taskAdded, taskRemoved);
    j.fact(trash);
    j.fact({ type: "Completed", task: [trash] });
    expect(tasks.length).to.equal(0);
    watch.stop();
  });

  it ("should remove an existing fact when a successor is added via array", function () {
    j.fact(trash);
    var watch = j.watch(chores, [tasksInList], taskAdded, taskRemoved);
    j.fact({ type: "Completed", task: [trash] });
    expect(tasks.length).to.equal(0);
    watch.stop();
  });
});
