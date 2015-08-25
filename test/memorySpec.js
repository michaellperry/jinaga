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

  var query = new Interface.JoinQuery(
    new Interface.SelfQuery([]),
    new Interface.Join(Interface.Direction.Successor, "list"),
    []
  );

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
});
