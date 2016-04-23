var mocha = require("mocha");
var chai = require("chai");
var MongoProvider = require("../node/jinaga.mongo");
var Interface = require("../node/interface");
var url = 'mongodb://localhost:27017/test';

var should = chai.should();

describe("Mongo", function() {
  var coordinator;
  var mongo;

  beforeEach(function () {
    coordinator = new function() {
      this.onSaved = function(fact) {
      };

      this.onError = function(err) {
        console.log(JSON.stringify(err));
        should.equal("", err);
      };
    }();
    mongo = new MongoProvider(url);
    mongo.init(coordinator);

    chores.time = new Date();
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

  var query = Interface.fromDescriptiveString("S.list");

  it("should return no results when has no facts", function(done) {
    mongo.executeQuery(chores, query, null, function (error, messages) {
      should.equal(null, error);
      messages.length.should.equal(0);
      done();
    });
  });

  it("should return one result when has a matching fact", function(done) {
    mongo.save(chores, null);
    var task = {
      type: "Task",
      list: chores,
      description: "Take out the trash"
    };
    mongo.whenQuiet(function () {
      mongo.save(task, null);
    });

    mongo.whenQuiet(function() {
      mongo.executeQuery(chores, query, null, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        messages[0].description.should.equal("Take out the trash");
        done();
      });
    });
  });

  it("should add nested messages", function(done) {
    var task = {
      type: "Task",
      list: chores,
      description: "Take out the trash"
    };
    mongo.save(task, null);

    mongo.whenQuiet(function() {
      mongo.executeQuery(chores, query, null, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        messages[0].description.should.equal("Take out the trash");
        done();
      });
    });
  });

  it("should compare based on value", function(done) {
    var task = {
      type: "Task",
      list: { type: "List", name: "Chores", time: chores.time },
      description: "Take out the trash"
    };
    mongo.save(task, null);

    mongo.whenQuiet(function() {
      mongo.executeQuery(chores, query, null, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        messages[0].description.should.equal("Take out the trash");
        done();
      });
    });
  });

  it("should not match if predecessor is different", function(done) {
    var task = {
      type: "Task",
      list: { type: "List", name: "Fun", time: chores.time },
      description: "Play XBox"
    };
    mongo.save(task, null);

    mongo.whenQuiet(function() {
      mongo.executeQuery(chores, query, null, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(0);
        done();
      });
    });
  });

  it.only("should find grandchildren", function(done) {
    mongo.save(completion, null);

    mongo.whenQuiet(function() {
      mongo.executeQuery(chores, Interface.fromDescriptiveString("S.list S.task"), null, function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(1);
        messages[0].completed.should.equal(true);
        done();
      });
    });
  });

  it("should find grandchildren with array", function(done) {
    mongo.save(completionWithArray, null);

    mongo.whenQuiet(function () {
      mongo.executeQuery(chores, Interface.fromDescriptiveString("S.list S.task"), null, function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(1);
        messages[0].completed.should.equal(true);
        done();
      });
    });
  });

  it("should find grandparents", function(done) {
    mongo.save(completion, null);

    mongo.whenQuiet(function() {
      mongo.executeQuery(completion, Interface.fromDescriptiveString("P.task P.list"), null, function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(1);
        messages[0].name.should.equal("Chores");
        done();
      });
    });
  });

  it("should match based on field values", function(done) {
    mongo.save(completion, null);

    mongo.whenQuiet(function() {
      mongo.executeQuery(completion, Interface.fromDescriptiveString("P.task F.type=\"Task\" P.list F.type=\"List\""), null, function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(1);
        messages[0].type.should.equal("List");
        done();
      });
    });
  });

  it("should not match if final field values are different", function(done) {
    mongo.save(completion, null);

    mongo.whenQuiet(function() {
      mongo.executeQuery(completion, Interface.fromDescriptiveString("P.task F.type=\"Task\" P.list F.type=\"No Match\""), null, function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(0);
        done();
      });
    });
  });

  it("should not match if interior field values are different", function(done) {
    mongo.save(completion, null);

    mongo.whenQuiet(function() {
      mongo.executeQuery(completion, Interface.fromDescriptiveString("P.task F.type=\"No Match\" P.list F.type=\"List\""), null, function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(0);
        done();
      });
    });
  });

  it("should not match not exists if completion exists", function(done) {
    mongo.save(completion, null);

    mongo.whenQuiet(function() {
      mongo.executeQuery(chores, Interface.fromDescriptiveString("S.list N(S.task)"), null, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(0);
        done();
      });
    });
  });

  it("should match not exists if completion does not exist", function(done) {
    mongo.save(task, null);

    mongo.whenQuiet(function() {
      mongo.executeQuery(chores, Interface.fromDescriptiveString("S.list N(S.task)"), null, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        done();
      });
    });
  });

  it("should match exists if completion exists", function(done) {
    mongo.save(completion, null);

    mongo.whenQuiet(function() {
      mongo.executeQuery(chores, Interface.fromDescriptiveString("S.list E(S.task)"), null, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        done();
      });
    });
  });

  it("should not match exists if completion does not exist", function(done) {
    mongo.save(task, null);

    mongo.whenQuiet(function() {
      mongo.executeQuery(chores, Interface.fromDescriptiveString("S.list E(S.task)"), null, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(0);
        done();
      });
    });
  });

  it("existential condition works with field conditions negative", function(done) {
    mongo.save(task, null);

    mongo.whenQuiet(function() {
      mongo.executeQuery(chores, Interface.fromDescriptiveString("F.type=\"List\" S.list F.type=\"Task\" N(S.task F.type=\"TaskComplete\")"), null, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        done();
      });
    });
  });

  it("existential condition works with field conditions positive", function(done) {
    mongo.save(completion, null);

    mongo.whenQuiet(function() {
      mongo.executeQuery(chores, Interface.fromDescriptiveString("F.type=\"List\" S.list F.type=\"Task\" N(S.task F.type=\"TaskComplete\")"), null, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(0);
        done();
      });
    });
  });

  it("should find successor based on array with multiple entries", function(done) {
    mongo.save(completionForward, null);

    mongo.whenQuiet(function() {
      mongo.executeQuery(task, Interface.fromDescriptiveString("F.type=\"Task\" S.task F.type=\"TaskComplete\""), null, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        done();
      });
    });
  });
});
