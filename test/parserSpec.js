var Interface = require("../node/interface");
var Direction = Interface.Direction;
var parse = require("../node/queryParser");

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
    var joins = parse([tasksInList]);
    joins.length.should.equal(1);
    joins[0].direction.should.equal(Direction.Successor);
    joins[0].role.should.equal("list");
  });

  it("should find two successors", function () {
    var joins = parse([completionsInList]);
    joins.length.should.equal(2);
    joins[0].direction.should.equal(Direction.Successor);
    joins[0].role.should.equal("list");
    joins[1].direction.should.equal(Direction.Successor);
    joins[1].role.should.equal("task");
  });

  it("should find predecessor", function () {
    var joins = parse([listOfTask]);
    joins.length.should.equal(1);
    joins[0].direction.should.equal(Direction.Predecessor);
    joins[0].role.should.equal("list");
  });

  it("should find two predecessors", function () {
    var joins = parse([listOfCompletion]);
    joins.length.should.equal(2);
    joins[0].direction.should.equal(Direction.Predecessor);
    joins[0].role.should.equal("task");
    joins[1].direction.should.equal(Direction.Predecessor);
    joins[1].role.should.equal("list");
  });
});