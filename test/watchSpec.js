var chai = require("chai");
var Jinaga = require("../node/jinaga");

chai.should();

describe("Watch", function () {
  var j;
  beforeEach(function() {
    j = new Jinaga();
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

  it("should return a matching message", function () {
    var tasks = [];
    function taskAdded(task) {
      tasks.push(task);
    }

    j.watch(chores, [tasksInList], taskAdded);
    j.fact(trash);

    tasks.length.should.equal(1);
    tasks[0].should.equal(trash);
  });

  it("should return existing message", function () {
    var tasks = [];
    function taskAdded(task) {
      tasks.push(task);
    }

    j.fact(trash);
    j.watch(chores, [tasksInList], taskAdded);

    tasks.length.should.equal(1);
    tasks[0].should.equal(trash);
  });
});
