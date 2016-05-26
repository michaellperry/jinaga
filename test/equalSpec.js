var chai = require("chai");
var Collections = require("../node/collections");
var _isEqual = Collections._isEqual;

var expect = chai.expect;

describe("Equal", function () {
    it("should be different", function () {
        var equal = _isEqual({ match: "not" }, {});
        expect(equal).to.equal(false);
    });

    it("should be commutative", function () {
        var equal = _isEqual({}, { match: "not" });
        expect(equal).to.equal(false);
    });
});