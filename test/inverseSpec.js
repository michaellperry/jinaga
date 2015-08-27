var chai = require("chai");
var Jinaga = require("../node/jinaga");
var QueryInverter = require("../node/queryInverter");
var invertQuery = QueryInverter.invertQuery;
var Interface = require("../node/interface");
var Join = Interface.Join;
var Direction = Interface.Direction;
var SelfQuery = Interface.SelfQuery;
var JoinQuery = Interface.JoinQuery;

var should = chai.should();

describe("QueryInverter", function() {
  it("the identity query does not affect any others", function () {
    var inverses = invertQuery(new SelfQuery([]));
    inverses.length.should.equal(0);
  });

  it("a predecessor query cannot affect anything: the successor does not yet exist", function () {
    var inverses = invertQuery(
      new JoinQuery(
        new SelfQuery([]),
        new Join(Direction.Predecessor, "project"),
        []));
    inverses.length.should.equal(0);
  });

  it("a successor query affects its predecessor; it adds the new fact itself", function () {
    var inverses = invertQuery(
      new JoinQuery(
        new SelfQuery([]),
        new Join(Direction.Successor, "project"),
        []));
    inverses.length.should.equal(1);
    inverses[0].affected.toDescriptiveString().should.equal("()P.project()");
    inverses[0].added.toDescriptiveString().should.equal("()");
    should.equal(null, inverses[0].removed);
  });

  it("a zig-zag query adds the new fact's predecessor to its other predecessor", function () {
    var inverses = invertQuery(
      new JoinQuery(
        new JoinQuery(
          new SelfQuery([]),
          new Join(Direction.Successor, "user"),
          []
        ),
        new Join(Direction.Predecessor, "project"),
        []));
    inverses.length.should.equal(1);

    inverses[0].affected.toDescriptiveString().should.equal("()P.user()");
    inverses[0].added.toDescriptiveString().should.equal("()P.project()");
    should.equal(null, inverses[0].removed);
  });
});
