var chai = require("chai");
var Jinaga = require("../node/jinaga");
var Collections = require("../node/collections");

var expect = chai.expect;
var _isEqual = Collections._isEqual;

var thisUser = {
  type: "Jinaga.User",
  publicKey: "-----BEGIN RSA PUBLIC KEY-----\nMIGJAoGBAMBAAE=\n-----END RSA PUBLIC KEY-----\n"
};

var DistributorProxy = (function () {
  function DistributorProxy() {
  }
  DistributorProxy.prototype.init = function (coordinator) {
    this.coordinator = coordinator;
    this.coordinator.onLoggedIn(thisUser)
  };
  DistributorProxy.prototype.watch = function (start, query) {
  };
  DistributorProxy.prototype.fact = function (fact) {
  };
  DistributorProxy.prototype.onMessage = function (message) {
  };
  return DistributorProxy;
})();

describe("Login", function() {
  it("should return current user fact", function (done) {
    var j = new Jinaga();
    j.sync(new DistributorProxy());

    j.login(function (user) {
      expect(user).to.not.be.null;
      expect(user.type).to.equal("Jinaga.User");
      expect(user.publicKey).to.equal("-----BEGIN RSA PUBLIC KEY-----\nMIGJAoGBAMBAAE=\n-----END RSA PUBLIC KEY-----\n");
      done();
    })
  });
});
