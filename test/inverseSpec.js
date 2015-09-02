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
    var inverses = invertQuery(Interface.fromDescriptiveString(""));
    inverses.length.should.equal(0);
  });

  it("a predecessor query cannot affect anything: the successor does not yet exist", function () {
    var inverses = invertQuery(Interface.fromDescriptiveString("P.project"));
    inverses.length.should.equal(0);
  });

  it("a successor query affects its predecessor; it adds the new fact itself", function () {
    var inverses = invertQuery(Interface.fromDescriptiveString("S.project"));
    inverses.length.should.equal(1);
    inverses[0].affected.toDescriptiveString().should.equal("P.project");
    inverses[0].added.toDescriptiveString().should.equal("");
    should.equal(null, inverses[0].removed);
  });

  it("a zig-zag query adds the new fact's predecessor to its other predecessor", function () {
    var inverses = invertQuery(Interface.fromDescriptiveString("S.user P.project"));
    inverses.length.should.equal(1);

    inverses[0].affected.toDescriptiveString().should.equal("P.user");
    inverses[0].added.toDescriptiveString().should.equal("P.project");
    should.equal(null, inverses[0].removed);
  });

  it("a field value is applied to the affected query", function () {
    var inverses = invertQuery(Interface.fromDescriptiveString("S.user F.type=\"Assignment\" P.project"));
    inverses.length.should.equal(1);

    inverses[0].affected.toDescriptiveString().should.equal("F.type=\"Assignment\" P.user");
    inverses[0].added.toDescriptiveString().should.equal("P.project");
    should.equal(null, inverses[0].removed);
  });
});
