var chai = require("chai");
var Jinaga = require("../node/jinaga");

chai.should();

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
    return {
      list: l
    };
  }

  var tasks;
  function taskAdded(task) {
    tasks.push(task);
  }

  it("should return a matching message", function () {
    j.watch(chores, [tasksInList], taskAdded);
    j.fact(trash);

    tasks.length.should.equal(1);
    tasks[0].should.equal(trash);
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
    tasks[0].should.equal(trash);
  });

  it("should match a predecessor", function () {
    j.watch(chores, [tasksInList], taskAdded);
    j.fact({
      type: "TaskCompletion",
      task: trash
    });

    tasks.length.should.equal(1);
    tasks[0].should.equal(trash);
  })
});
