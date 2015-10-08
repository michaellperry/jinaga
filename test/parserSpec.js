var chai = require("chai");
var Interface = require("../node/interface");
var Direction = Interface.Direction;
var parse = require("../node/queryParser");
var Jinaga = require("../node/jinaga");

var should = chai.should();

describe("QueryParser", function() {

  var j;

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

  function taskIsNotCompleted(t) {
    return j.not({
      type: "Completion",
      task: t
    });
  }

  function taskIsCompleted(t) {
    return {
      type: "Completion",
      task: t
    };
  }

  function uncompletedTasksInList(l) {
    return j.where({
      type: "Task",
      list: l
    }, [taskIsNotCompleted]);
  }

  function completedTasksInList(l) {
    return j.where({
      type: "Task",
      list: l
    }, [taskIsCompleted]);
  }

  function uncompletedTasksInListAlt(l) {
    return j.where({
      type: "Task",
      list: l
    }, [j.not(taskIsCompleted)]);
  }

  function completedTasksInListAlt(l) {
    return j.where({
      type: "Task",
      list: l
    }, [j.not(taskIsNotCompleted)]);
  }

  beforeEach(function () {
    j = new Jinaga();
  });

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

  it("should parse a negative existential condition", function () {
    var query = parse([uncompletedTasksInList]);
    query.toDescriptiveString().should.equal("S.list F.type=\"Task\" N(S.task F.type=\"Completion\")");
  });

  it("should parse a positive existential condition", function () {
    var query = parse([completedTasksInList]);
    query.toDescriptiveString().should.equal("S.list F.type=\"Task\" E(S.task F.type=\"Completion\")");
  });

  it("should parse a negative outside of template function", function () {
    var query = parse([uncompletedTasksInListAlt]);
    query.toDescriptiveString().should.equal("S.list F.type=\"Task\" N(S.task F.type=\"Completion\")");
  });

  it("should parse a double negative", function () {
    var query = parse([completedTasksInListAlt]);
    query.toDescriptiveString().should.equal("S.list F.type=\"Task\" E(S.task F.type=\"Completion\")");
  });
});
