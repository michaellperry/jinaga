var chai = require("chai");
var JinagaDistributor = require("../node/jinaga.distributor.server");
var MongoProvider = require("../node/jinaga.mongo");

var url = "mongodb://localhost:27017/test";

var expect = chai.expect;

function SocketProxy() {
  this.message = null;

  this.on = function (event, handler) {
    if (event === "message")
      this.onMessage = handler;
  }.bind(this);

  this.watch = function(start, query) {
    this.onMessage(JSON.stringify({
      type: "watch",
      start: start,
      query: query
    }));
  };

  this.send = function (message) {
    this.message = message;
  }
}

var thisUser = {
  type: "Jinaga.User",
  publicKey: "-----BEGIN RSA PUBLIC KEY-----\nMIGJAoGBAMBAAE=\n-----END RSA PUBLIC KEY-----\n"
};

var otherUser = {
  type: "Jinaga.User",
  publicKey: "-----BEGIN RSA PUBLIC KEY-----\notheruser\n-----END RSA PUBLIC KEY-----\n"
};

function authenticateFor(user) {
  return function authenticate(socket, done) {
    done(user);
  }
}

describe("DistributorServer", function() {
  var topic = {
    type: "Yaca.Topic",
    from: thisUser,
    name: "Space Paranoids"
  };

  beforeEach(function () {
    topic.createdAt = new Date().toJSON();
  });

  it("should send fact to endpoint", function (done) {
    var mongo = new MongoProvider(url);
    var distributor = new JinagaDistributor(mongo, mongo, authenticateFor(thisUser));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    mongo.whenDone(function () {
      proxy.watch({
        name: "Chores"
      }, "S.list");
      mongo.whenDone(function () {
        distributor.onReceived({ list: { name: "Chores" }, description: "Take out the trash" }, null);

        mongo.whenDone(function () {
          expect(proxy.message).to.equal("{\"type\":\"fact\",\"fact\":{\"list\":{\"name\":\"Chores\"},\"description\":\"Take out the trash\"}}");
          done();
        });
      });
    });
  });

  it ("should allow facts in topics from this user", function (done) {
    var mongo = new MongoProvider(url);
    var distributor = new JinagaDistributor(mongo, mongo, authenticateFor(thisUser));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    mongo.whenDone(function () {
      proxy.watch(topic, "S.in F.type=\"Yaca.Post\"");
      mongo.whenDone(function () {
        distributor.onReceived({
          type: "Yaca.Post",
          from: thisUser,
          in: topic
        }, thisUser, null);

        mongo.whenDone(function () {
          expect(proxy.message).to.not.be.null;
          done();
        });
      });
    });
  });

  it ("should disallow facts sent by another user", function (done) {
    var mongo = new MongoProvider(url);
    var distributor = new JinagaDistributor(mongo, mongo, authenticateFor(thisUser));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    mongo.whenDone(function () {
      proxy.watch(topic, "S.in F.type=\"Yaca.Post\"");
      mongo.whenDone(function () {
        distributor.onReceived({
          type: "Yaca.Post",
          from: thisUser,
          in: topic
        }, otherUser, null);

        mongo.whenDone(function () {
          expect(proxy.message).to.be.null;
          done();
        });
      });
    });
  });

  it ("should disallow facts in topics not from this user, especially when sent by another", function (done) {
    var mongo = new MongoProvider(url);
    var distributor = new JinagaDistributor(mongo, mongo, authenticateFor(thisUser));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    mongo.whenDone(function () {
      proxy.watch(topic, "S.in F.type=\"Yaca.Post\"");
      mongo.whenDone(function () {
        distributor.onReceived({
          type: "Yaca.Post",
          from: otherUser,
          in: topic
        }, thisUser, null);

        mongo.whenDone(function () {
          expect(proxy.message).to.be.null;
          done();
        });
      });
    });
  });

  it ("should disallow facts in topics not from this user", function (done) {
    var mongo = new MongoProvider(url);
    var distributor = new JinagaDistributor(mongo, mongo, authenticateFor(thisUser));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    mongo.whenDone(function () {
      proxy.watch(topic, "S.in F.type=\"Yaca.Post\"");
      mongo.whenDone(function () {
        distributor.onReceived({
          type: "Yaca.Post",
          from: otherUser,
          in: topic
        }, otherUser, null);

        mongo.whenDone(function () {
          expect(proxy.message).to.be.null;
          done();
        });
      });
    });
  });

  it ("should not return existing facts in a predecessor to an unauthorized user", function (done) {
    var mongo = new MongoProvider(url);
    var distributor = new JinagaDistributor(mongo, mongo, authenticateFor(otherUser));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    mongo.whenDone(function () {
      distributor.onReceived({
        type: "Yaca.Post",
        from: thisUser,
        in: topic
      }, thisUser, null);
      mongo.whenDone(function () {
        proxy.watch(topic, "S.in F.type=\"Yaca.Post\"");

        mongo.whenDone(function () {
          expect(proxy.message).to.be.null;
          done();
        });
      });
    });
  });

  it ("should return existing facts in a predecessor to an authorized user", function (done) {
    var mongo = new MongoProvider(url);
    var distributor = new JinagaDistributor(mongo, mongo, authenticateFor(thisUser));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    mongo.whenDone(function () {
      distributor.onReceived({
        type: "Yaca.Post",
        from: thisUser,
        in: topic
      }, thisUser, null);
      mongo.whenDone(function () {
        proxy.watch(topic, "S.in F.type=\"Yaca.Post\"");

        mongo.whenDone(function () {
          expect(proxy.message).to.not.be.null;
          done();
        });
      });
    });
  });
});