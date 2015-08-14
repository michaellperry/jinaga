var chai = require("chai");
var j = require ('../src/jinaga')

chai.should();

describe("Query", function () {
  it("should return a matching message", function () {
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

    var tasks = [];
    function taskAdded(task) {
      tasks.push(task);
    }

    j.query(chores, [tasksInList], taskAdded);
    j.fact(trash);

    tasks.length.should.equal(1);
    tasks[0].should.equal(trash);
  });
});
