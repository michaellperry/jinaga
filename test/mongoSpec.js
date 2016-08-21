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
    mongo.executePartialQuery(chores, query, function (error, messages) {
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
      mongo.executePartialQuery(chores, query, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        messages[0].description.should.equal("Take out the trash");
        done();
      });
    });
  });

  it("should return cached results", function(done) {
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
      mongo.executePartialQuery(chores, query, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        messages[0].description.should.equal("Take out the trash");
      });
    });

    mongo.whenQuiet(function() {
      mongo.executePartialQuery(chores, query, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        messages[0].description.should.equal("Take out the trash");
        done();
      });
    });
  });

  it("should update cached results", function(done) {
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
      mongo.executePartialQuery(chores, query, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        messages[0].description.should.equal("Take out the trash");
      });
    });

    var task2 = {
      type: "Task",
      list: chores,
      description: "Deposit all the cache"
    };
    mongo.whenQuiet(function () {
      mongo.save(task2, null);
    });

    mongo.whenQuiet(function() {
      mongo.executePartialQuery(chores, query, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(2);
        messages[1].description.should.equal("Deposit all the cache");
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
      mongo.executePartialQuery(chores, query, function (error, messages) {
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
      mongo.executePartialQuery(chores, query, function (error, messages) {
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
      mongo.executePartialQuery(chores, query, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(0);
        done();
      });
    });
  });

  it("should find grandchildren", function(done) {
    mongo.save(completion, null);

    mongo.whenQuiet(function() {
      mongo.executePartialQuery(chores, Interface.fromDescriptiveString("S.list S.task"), function (error2, messages) {
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
      mongo.executePartialQuery(chores, Interface.fromDescriptiveString("S.list S.task"), function (error2, messages) {
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
      mongo.executePartialQuery(completion, Interface.fromDescriptiveString("P.task P.list"), function (error2, messages) {
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
      mongo.executePartialQuery(completion, Interface.fromDescriptiveString("P.task F.type=\"Task\" P.list F.type=\"List\""), function (error2, messages) {
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
      mongo.executePartialQuery(completion, Interface.fromDescriptiveString("P.task F.type=\"Task\" P.list F.type=\"No Match\""), function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(0);
        done();
      });
    });
  });

  it("should not match if interior field values are different", function(done) {
    mongo.save(completion, null);

    mongo.whenQuiet(function() {
      mongo.executePartialQuery(completion, Interface.fromDescriptiveString("P.task F.type=\"No Match\" P.list F.type=\"List\""), function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(0);
        done();
      });
    });
  });

  it("should find successor based on array with multiple entries", function(done) {
    mongo.save(completionForward, null);

    mongo.whenQuiet(function() {
      mongo.executePartialQuery(task, Interface.fromDescriptiveString("F.type=\"Task\" S.task F.type=\"TaskComplete\""), function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        done();
      });
    });
  });
});
