var chai = require("chai");
var Interface = require("../node/interface");
var Direction = Interface.Direction;
var parse = require("../node/queryParser");

var should = chai.should();

describe("QueryParser", function() {

  function tasksInList(l) {
    return {
      type: "Task",
      list: l
    };
  }

  function completionsInList(l) {
    return {
      type: "Completion",
      task: {
        type: "Task",
        list: l
      }
    };
  }

  function listOfTask(t) {
    t.has("list");
    t.type = "Task";
    return t.list;
  }

  function listOfCompletion(c) {
    c.has("task").has("list");
    c.type = "Completion";
    c.task.type = "Task";
    return c.task.list;
  }

  it("should parse to a successor query", function () {
    var query = parse([tasksInList]);
    query.toDescriptiveString().should.equal("S.list F.type=\"Task\"");
  });

  it("should find two successors", function () {
    var query = parse([completionsInList]);
    query.toDescriptiveString().should.equal("S.list F.type=\"Task\" S.task F.type=\"Completion\"");
  });

  it("should find predecessor", function () {
    var query = parse([listOfTask]);
    query.toDescriptiveString().should.equal("F.type=\"Task\" P.list");
  });

  it("should find two predecessors", function () {
    var query = parse([listOfCompletion]);
    query.toDescriptiveString().should.equal("F.type=\"Completion\" P.task F.type=\"Task\" P.list");
  });
});