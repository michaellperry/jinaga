var chai = require("chai");
var Jinaga = require("../node/jinaga");
var QueryInverter = require("../node/queryInverter");
var invertQuery = QueryInverter.invertQuery;
var Interface = require("../node/interface");
var Join = Interface.Join;
var Direction = Interface.Direction;

var should = chai.should();

describe("QueryInverter", function() {
  it("the identity query does not affect any others", function () {
    var inverses = invertQuery([]);
    inverses.length.should.equal(0);
  });

  it("a predecessor query cannot affect anything: the successor does not yet exist", function () {
    var inverses = invertQuery([new Join(Direction.Predecessor, "project", [])]);
    inverses.length.should.equal(0);
  });

  it("a successor query affects its predecessor; it adds the new fact itself", function () {
    var inverses = invertQuery([new Join(Direction.Successor, "project", [])]);
    inverses.length.should.equal(1);
    inverses[0].affected.length.should.equal(1);
    inverses[0].affected[0].direction.should.equal(Direction.Successor);
    inverses[0].affected[0].role.should.equal("project");
    inverses[0].added.length.should.equal(0);
    should.equal(null, inverses[0].removed.length);
  });

  it("a zig-zag query adds the new fact's predecessor to its other predecessor", function () {
    var inverses = invertQuery([
      new Join(Direction.Successor, "user", []),
      new Join(Direction.Predecessor, "project", [])
    ]);
    inverses.length.should.equal(1);
    inverses[0].affected.length.should.equal(1);
    inverses[0].affected[0].direction.should.equal(Direction.Predecessor);
    inverses[0].affected[0].role.should.equal("project");
    inverses[0].added.length.should.equal(1);
    inverses[0].added[0].direction.should.equal(Direction.Predecessor);
    inverses[0].added[0].role.should.equal("project");
  });
});
