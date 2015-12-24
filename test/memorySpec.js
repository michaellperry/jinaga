var mocha = require("mocha");
var chai = require("chai");
var MemoryProvider = require("../node/memory");
var Interface = require("../node/interface");

var should = chai.should();

describe("Memory", function() {
  var memory;

  beforeEach(function () {
    memory = new MemoryProvider();
    memory.init({ onSaved: function() {} })
  });

  var chores = {
    type: "List",
    name: "Chores"
  };

  var task = {
    type: "Task",
    list: chores,
    description: "Empty the dishwasher"
  };

  var task2 = {
    type: "Task",
    list: chores,
    description: "Take out the trash"
  };

  var completion = {
    type: "TaskComplete",
    completed: true,
    task: task
  };

  var completionWithArray = {
    type: "TaskComplete",
    completed: true,
    task: [task]
  };

  var completionForward = {
    type: "TaskComplete",
    completed: true,
    task: [task, task2]
  };

  var completionBackward = {
    type: "TaskComplete",
    completed: true,
    task: [task2, task]
  };

  var query = Interface.fromDescriptiveString("S.list");

  it("should return no results when has no facts", function(done) {
    memory.executeQuery(chores, query, null, function (error, messages) {
      should.equal(null, error);
      messages.length.should.equal(0);
      done();
    });
  });

  it("should return one result when has a matching fact", function(done) {
    memory.save(chores, null);
    memory.save({
      type: "Task",
      list: chores,
      description: "Take out the trash"
    }, null);

    memory.executeQuery(chores, query, null, function (error, messages) {
      should.equal(null, error);
      messages.length.should.equal(1);
      messages[0].description.should.equal("Take out the trash");
      done();
    });
  });

  it("should add nested messages", function(done) {
    memory.save({
      type: "Task",
      list: chores,
      description: "Take out the trash"
    }, null);

    memory.executeQuery(chores, query, null, function (error, messages) {
      should.equal(null, error);
      messages.length.should.equal(1);
      messages[0].description.should.equal("Take out the trash");
      done();
    });
  });

  it("should compare based on value", function(done) {
    memory.save({
      type: "Task",
      list: { type: "List", name: "Chores" },
      description: "Take out the trash"
    }, null);

    memory.executeQuery(chores, query, null, function (error, messages) {
      should.equal(null, error);
      messages.length.should.equal(1);
      messages[0].description.should.equal("Take out the trash");
      done();
    });
  });

  it("should not match if predecessor is different", function(done) {
    memory.save({
      type: "Task",
      list: { type: "List", name: "Fun" },
      description: "Play XBox"
    }, null);

    memory.executeQuery(chores, query, null, function (error, messages) {
      should.equal(null, error);
      messages.length.should.equal(0);
      done();
    });
  });

  it("should find grandchildren", function(done) {
    memory.save(completion, null);

    memory.executeQuery(chores, Interface.fromDescriptiveString("S.list S.task"), null, function (error2, messages) {
      should.equal(null, error2);
      messages.length.should.equal(1);
      messages[0].completed.should.equal(true);
      done();
    });
  });

  it("should find grandchildren with array", function(done) {
    memory.save(completionWithArray, null);

    memory.executeQuery(chores, Interface.fromDescriptiveString("S.list S.task"), null, function (error2, messages) {
      should.equal(null, error2);
      messages.length.should.equal(1);
      messages[0].completed.should.equal(true);
      done();
    });
  });

  it("should find grandparents", function(done) {
    memory.save(completion, null);

    memory.executeQuery(completion, Interface.fromDescriptiveString("P.task P.list"), null, function (error2, messages) {
      should.equal(null, error2);
      messages.length.should.equal(1);
      messages[0].name.should.equal("Chores");
      done();
    });
  });

  it("should match based on field values", function(done) {
    memory.save(completion, null);

    memory.executeQuery(completion, Interface.fromDescriptiveString("P.task F.type=\"Task\" P.list F.type=\"List\""), null, function (error2, messages) {
      should.equal(null, error2);
      messages.length.should.equal(1);
      messages[0].type.should.equal("List");
      done();
    });
  });

  it("should not match if final field values are different", function(done) {
    memory.save(completion, null);

    memory.executeQuery(completion, Interface.fromDescriptiveString("P.task F.type=\"Task\" P.list F.type=\"No Match\""), null, function (error2, messages) {
      should.equal(null, error2);
      messages.length.should.equal(0);
      done();
    });
  });

  it("should not match if interior field values are different", function(done) {
    memory.save(completion, null);

    memory.executeQuery(completion, Interface.fromDescriptiveString("P.task F.type=\"No Match\" P.list F.type=\"List\""), null, function (error2, messages) {
      should.equal(null, error2);
      messages.length.should.equal(0);
      done();
    });
  });

  it("should not match not exists if completion exists", function(done) {
    memory.save(completion, null);

    memory.executeQuery(chores, Interface.fromDescriptiveString("S.list N(S.task)"), null, function (error, messages) {
      should.equal(null, error);
      messages.length.should.equal(0);
      done();
    });
  });

  it("should match not exists if completion does not exist", function(done) {
    memory.save(task, null);

    memory.executeQuery(chores, Interface.fromDescriptiveString("S.list N(S.task)"), null, function (error, messages) {
      should.equal(null, error);
      messages.length.should.equal(1);
      done();
    });
  });

  it("should match exists if completion exists", function(done) {
    memory.save(completion, null);

    memory.executeQuery(chores, Interface.fromDescriptiveString("S.list E(S.task)"), null, function (error, messages) {
      should.equal(null, error);
      messages.length.should.equal(1);
      done();
    });
  });

  it("should not match exists if completion does not exist", function(done) {
    memory.save(task, null);

    memory.executeQuery(chores, Interface.fromDescriptiveString("S.list E(S.task)"), null, function (error, messages) {
      should.equal(null, error);
      messages.length.should.equal(0);
      done();
    });
  });

  it("existential condition works with field conditions negative", function(done) {
    memory.save(task, null);

    memory.executeQuery(chores, Interface.fromDescriptiveString("F.type=\"List\" S.list F.type=\"Task\" N(S.task F.type=\"TaskComplete\")"), null, function (error, messages) {
      should.equal(null, error);
      messages.length.should.equal(1);
      done();
    });
  });

  it("existential condition works with field conditions positive", function(done) {
    memory.save(completion, null);

    memory.executeQuery(chores, Interface.fromDescriptiveString("F.type=\"List\" S.list F.type=\"Task\" N(S.task F.type=\"TaskComplete\")"), null, function (error, messages) {
      should.equal(null, error);
      messages.length.should.equal(0);
      done();
    });
  });

  it("should find successor based on array with multiple entries", function(done) {
    memory.save(completionForward, null);

    memory.executeQuery(task, Interface.fromDescriptiveString("F.type=\"Task\" S.task F.type=\"TaskComplete\""), null, function (error, messages) {
      should.equal(null, error);
      messages.length.should.equal(1);
      done();
    });
  });

  it("order of predecessors should not matter", function(done) {
    memory.save(completionForward, null);
    memory.save(completionBackward, null);

    memory.executeQuery(task, Interface.fromDescriptiveString("S.task"), null, function (error, messages) {
      should.equal(null, error);
      messages.length.should.equal(1);
      done();
    })
  })
});
