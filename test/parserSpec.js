var chai = require("chai");
var Interface = require("../node/interface");
var Direction = Interface.Direction;
var parse = require("../node/queryParser");

var should = chai.should();

describe("QueryParser", function() {

  function tasksInList(l) {
    return {
      list: l
    };
  }

  function completionsInList(l) {
    return {
      task: {
        list: l
      }
    };
  }

  function listOfTask(t) {
    t.has("list");
    return t.list;
  }

  function listOfCompletion(c) {
    c.has("task").has("list");
    return c.task.list;
  }

  it("should parse to a successor query", function () {
    var query = parse([tasksInList]);
    query.toDescriptiveString().should.equal("S.list");
  });

  it("should find two successors", function () {
    var query = parse([completionsInList]);
    query.toDescriptiveString().should.equal("S.list S.task");
  });

  it("should find predecessor", function () {
    var query = parse([listOfTask]);
    query.toDescriptiveString().should.equal("P.list");
  });

  it("should find two predecessors", function () {
    var query = parse([listOfCompletion]);
    query.toDescriptiveString().should.equal("P.task P.list");
  });
});