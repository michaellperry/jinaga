var mocha = require("mocha");
var chai = require("chai");
var MemoryProvider = require("../node/memory");
var Interface = require("../node/interface");

var should = chai.should();

describe("Memory", function() {
  var memory;

  beforeEach(function () {
    memory = new MemoryProvider();
  });

  var chores = {
    name: "Chores"
  };

  var completion = {
    completed: true,
    task: {
      list: chores,
      description: "Empty the dishwasher"
    }
  };

  var query = Interface.fromDescriptiveString("()S.list()");

  it("should return no results when has no facts", function(done) {
    memory.executeQuery(chores, query, function (error, messages) {
      should.equal(null, error);
      messages.length.should.equal(0);
      done();
    });
  });

  it("should return one result when has a matching fact", function(done) {
    memory.save(chores, function () {
      memory.save({
        list: chores,
        description: "Take out the trash"
      }, function () {
        memory.executeQuery(chores, query, function (error, messages) {
          should.equal(null, error);
          messages.length.should.equal(1);
          messages[0].description.should.equal("Take out the trash");
          done();
        });
      });
    });
  });

  it("should add nested messages", function(done) {
    memory.save({
      list: chores,
      description: "Take out the trash"
    }, function () {
      memory.executeQuery(chores, query, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        messages[0].description.should.equal("Take out the trash");
        done();
      });
    });
  });

  it("should compare based on value", function(done) {
    memory.save({
      list: { name: "Chores" },
      description: "Take out the trash"
    }, function () {
      memory.executeQuery(chores, query, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(1);
        messages[0].description.should.equal("Take out the trash");
        done();
      });
    });
  });

  it("should not match if predecessor is different", function(done) {
    memory.save({
      list: { name: "Fun" },
      description: "Play XBox"
    }, function () {
      memory.executeQuery(chores, query, function (error, messages) {
        should.equal(null, error);
        messages.length.should.equal(0);
        done();
      });
    });
  });

  it("should find grandchildren", function(done) {
    memory.save(completion, function(error1) {
      should.equal(null, error1);
      memory.executeQuery(chores, Interface.fromDescriptiveString("()S.list()S.task()"), function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(1);
        messages[0].completed.should.equal(true);
        done();
      });
    });
  });

  it("should find grandparents", function(done) {
    memory.save(completion, function(error1) {
      should.equal(null, error1);
      memory.executeQuery(chores, Interface.fromDescriptiveString("()P.task()P.list()"), function (error2, messages) {
        should.equal(null, error2);
        messages.length.should.equal(1);
        messages[0].name.should.equal("Chores");
        done();
      });
    });
  });
});
