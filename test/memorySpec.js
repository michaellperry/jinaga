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

  var completion = {
    type: "TaskComplete",
    completed: true,
    task: task
  };

  var query = Interface.fromDescriptiveString("S.list");

  it("should return no results when has no facts", function(done) {
    memory.open(function (connection) {
      connection.executeQuery(chores, query, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(0);
        connection.close();
        done();
      });
    });
  });

  it("should return one result when has a matching fact", function(done) {
    memory.save(chores, false, null);
    memory.save({
      list: chores,
      description: "Take out the trash"
    }, false, null);

    memory.open(function (connection) {
      connection.executeQuery(chores, query, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        messages[0].description.should.equal("Take out the trash");
        connection.close();
        done();
      });
    });
  });

  it("should add nested messages", function(done) {
    memory.save({
      list: chores,
      description: "Take out the trash"
    }, false, null);

    memory.open(function (connection) {
      connection.executeQuery(chores, query, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        messages[0].description.should.equal("Take out the trash");
        connection.close();
        done();
      });
    });
  });

  it("should compare based on value", function(done) {
    memory.save({
      list: { type: "List", name: "Chores" },
      description: "Take out the trash"
    }, false, null);

    memory.open(function (connection) {
      connection.executeQuery(chores, query, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        messages[0].description.should.equal("Take out the trash");
        connection.close();
        done();
      });
    });
  });

  it("should not match if predecessor is different", function(done) {
    memory.save({
      list: { type: "List", name: "Fun" },
      description: "Play XBox"
    }, false, null);

    memory.open(function (connection) {
      connection.executeQuery(chores, query, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(0);
        connection.close();
        done();
      });
    });
  });

  it("should find grandchildren", function(done) {
    memory.save(completion, false, null);

    memory.open(function (connection) {
      connection.executeQuery(chores, Interface.fromDescriptiveString("S.list S.task"), function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(1);
        messages[0].completed.should.equal(true);
        connection.close();
        done();
      });
    });
  });

  it("should find grandparents", function(done) {
    memory.save(completion, false, null);

    memory.open(function (connection) {
      connection.executeQuery(completion, Interface.fromDescriptiveString("P.task P.list"), function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(1);
        messages[0].name.should.equal("Chores");
        connection.close();
        done();
      });
    });
  });

  it("should match based on field values", function(done) {
    memory.save(completion, false, null);

    memory.open(function (connection) {
      connection.executeQuery(completion, Interface.fromDescriptiveString("P.task F.type=\"Task\" P.list F.type=\"List\""), function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(1);
        messages[0].type.should.equal("List");
        connection.close();
        done();
      });
    });
  });

  it("should not match if final field values are different", function(done) {
    memory.save(completion, false, null);

    memory.open(function (connection) {
      connection.executeQuery(completion, Interface.fromDescriptiveString("P.task F.type=\"Task\" P.list F.type=\"No Match\""), function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(0);
        connection.close();
        done();
      });
    });
  });

  it("should not match if interior field values are different", function(done) {
    memory.save(completion, false, null);

    memory.open(function (connection) {
      connection.executeQuery(completion, Interface.fromDescriptiveString("P.task F.type=\"No Match\" P.list F.type=\"List\""), function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(0);
        connection.close();
        done();
      });
    });
  });

  it("should not match not exists if completion exists", function(done) {
    memory.save(completion, false, null);

    memory.open(function (connection) {
      connection.executeQuery(chores, Interface.fromDescriptiveString("S.list N(S.task)"), function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(0);
        connection.close();
        done();
      });
    });
  });

  it("should match not exists if completion does not exist", function(done) {
    memory.save(task, false, null);

    memory.open(function (connection) {
      connection.executeQuery(chores, Interface.fromDescriptiveString("S.list N(S.task)"), function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        connection.close();
        done();
      });
    });
  });

  it("should match exists if completion exists", function(done) {
    memory.save(completion, false, null);

    memory.open(function (connection) {
      connection.executeQuery(chores, Interface.fromDescriptiveString("S.list E(S.task)"), function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        connection.close();
        done();
      });
    });
  });

  it("should not match exists if completion does not exist", function(done) {
    memory.save(task, false, null);

    memory.open(function (connection) {
      connection.executeQuery(chores, Interface.fromDescriptiveString("S.list E(S.task)"), function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(0);
        connection.close();
        done();
      });
    });
  });

  it("existential condition works with field conditions negative", function(done) {
    memory.save(task, false, null);

    memory.open(function (connection) {
      connection.executeQuery(chores, Interface.fromDescriptiveString("F.type=\"List\" S.list F.type=\"Task\" N(S.task F.type=\"TaskComplete\")"), function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        connection.close();
        done();
      });
    });
  });

  it("existential condition works with field conditions positive", function(done) {
    memory.save(completion, false, null);

    memory.open(function (connection) {
      connection.executeQuery(chores, Interface.fromDescriptiveString("F.type=\"List\" S.list F.type=\"Task\" N(S.task F.type=\"TaskComplete\")"), function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(0);
        connection.close();
        done();
      });
    });
  });
});
