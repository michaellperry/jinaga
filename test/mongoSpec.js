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
      this.continuations = [];

      this.onSaved = function() {
        if (this.continuations.length > 0) {
          this.continuations.shift()();
        }
      }.bind(this);

      this.afterSave = function(next) {
        this.continuations.push(next);
      }.bind(this);

      this.onError = function(err) {
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

  var completion = {
    type: "TaskComplete",
    completed: true,
    task: task
  };

  var query = Interface.fromDescriptiveString("S.list");

  it("should return no results when has no facts", function(done) {
    mongo.executeQuery(chores, query, function (error, messages) {
      should.equal(null, error);
      messages.length.should.equal(0);
      done();
    });
  });

  it("should return one result when has a matching fact", function(done) {
    mongo.save(chores, false, null);
    coordinator.afterSave(function () {
      mongo.save({
        list: chores,
        description: "Take out the trash"
      }, false, null);
    });

    coordinator.afterSave(function() {
      mongo.executeQuery(chores, query, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        messages[0].description.should.equal("Take out the trash");
        done();
      });
    });
  });

  it("should add nested messages", function(done) {
    mongo.save({
      list: chores,
      description: "Take out the trash"
    }, false, null);

    coordinator.afterSave(function() {
      mongo.executeQuery(chores, query, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        messages[0].description.should.equal("Take out the trash");
        done();
      });
    });
  });

  it("should compare based on value", function(done) {
    mongo.save({
      list: { type: "List", name: "Chores", time: chores.time },
      description: "Take out the trash"
    }, false, null);

    coordinator.afterSave(function() {
      mongo.executeQuery(chores, query, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        messages[0].description.should.equal("Take out the trash");
        done();
      });
    });
  });

  it("should not match if predecessor is different", function(done) {
    mongo.save({
      list: { type: "List", name: "Fun", time: chores.time },
      description: "Play XBox"
    }, false, null);

    coordinator.afterSave(function() {
      mongo.executeQuery(chores, query, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(0);
        done();
      });
    });
  });

  it("should find grandchildren", function(done) {
    mongo.save(completion, false, null);

    coordinator.afterSave(function() {
      mongo.executeQuery(chores, Interface.fromDescriptiveString("S.list S.task"), function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(1);
        messages[0].completed.should.equal(true);
        done();
      });
    });
  });

  it("should find grandparents", function(done) {
    mongo.save(completion, false, null);

    coordinator.afterSave(function() {
      mongo.executeQuery(completion, Interface.fromDescriptiveString("P.task P.list"), function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(1);
        messages[0].name.should.equal("Chores");
        done();
      });
    });
  });

  it("should match based on field values", function(done) {
    mongo.save(completion, false, null);

    coordinator.afterSave(function() {
      mongo.executeQuery(completion, Interface.fromDescriptiveString("P.task F.type=\"Task\" P.list F.type=\"List\""), function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(1);
        messages[0].type.should.equal("List");
        done();
      });
    });
  });

  it("should not match if final field values are different", function(done) {
    mongo.save(completion, false, null);

    coordinator.afterSave(function() {
      mongo.executeQuery(completion, Interface.fromDescriptiveString("P.task F.type=\"Task\" P.list F.type=\"No Match\""), function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(0);
        done();
      });
    });
  });

  it("should not match if interior field values are different", function(done) {
    mongo.save(completion, false, null);

    coordinator.afterSave(function() {
      mongo.executeQuery(completion, Interface.fromDescriptiveString("P.task F.type=\"No Match\" P.list F.type=\"List\""), function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(0);
        done();
      });
    });
  });

  it("should not match not exists if completion exists", function(done) {
    mongo.save(completion, false, null);

    coordinator.afterSave(function() {
      mongo.executeQuery(chores, Interface.fromDescriptiveString("S.list N(S.task)"), function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(0);
        done();
      });
    });
  });

  it("should match not exists if completion does not exist", function(done) {
    mongo.save(task, false, null);

    coordinator.afterSave(function() {
      mongo.executeQuery(chores, Interface.fromDescriptiveString("S.list N(S.task)"), function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        done();
      });
    });
  });

  it("should match exists if completion exists", function(done) {
    mongo.save(completion, false, null);

    coordinator.afterSave(function() {
      mongo.executeQuery(chores, Interface.fromDescriptiveString("S.list E(S.task)"), function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        done();
      });
    });
  });

  it("should not match exists if completion does not exist", function(done) {
    mongo.save(task, false, null);

    coordinator.afterSave(function() {
      mongo.executeQuery(chores, Interface.fromDescriptiveString("S.list E(S.task)"), function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(0);
        done();
      });
    });
  });

  it("existential condition works with field conditions negative", function(done) {
    mongo.save(task, false, null);

    coordinator.afterSave(function() {
      mongo.executeQuery(chores, Interface.fromDescriptiveString("F.type=\"List\" S.list F.type=\"Task\" N(S.task F.type=\"TaskComplete\")"), function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        done();
      });
    });
  });

  it("existential condition works with field conditions positive", function(done) {
    mongo.save(completion, false, null);

    coordinator.afterSave(function() {
      mongo.executeQuery(chores, Interface.fromDescriptiveString("F.type=\"List\" S.list F.type=\"Task\" N(S.task F.type=\"TaskComplete\")"), function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(0);
        done();
      });
    });
  });
});
