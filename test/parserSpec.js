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
    should.not.exist(query.head.join);
    query.join.direction.should.equal(Direction.Successor);
    query.join.role.should.equal("list");
  });

  it("should find two successors", function () {
    var query = parse([completionsInList]);
    should.not.exist(query.head.head.join);
    query.head.join.direction.should.equal(Direction.Successor);
    query.head.join.role.should.equal("list");
    query.join.direction.should.equal(Direction.Successor);
    query.join.role.should.equal("task");
  });

  it("should find predecessor", function () {
    var query = parse([listOfTask]);
    should.not.exist(query.head.join);
    query.join.direction.should.equal(Direction.Predecessor);
    query.join.role.should.equal("list");
  });

  it("should find two predecessors", function () {
    var query = parse([listOfCompletion]);
    should.not.exist(query.head.head.join);
    query.head.join.direction.should.equal(Direction.Predecessor);
    query.head.join.role.should.equal("task");
    query.join.direction.should.equal(Direction.Predecessor);
    query.join.role.should.equal("list");
  });
});