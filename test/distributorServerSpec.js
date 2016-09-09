var chai = require("chai");
var JinagaDistributor = require("../node/jinaga.distributor.server");
var MongoProvider = require("../node/jinaga.mongo");

var url = "mongodb://localhost:27017/test";

var expect = chai.expect;

function SocketProxy() {
  this.messages = [];

  this.on = function (event, handler) {
    if (event === "message")
      this.onMessage = handler;
  }.bind(this);

  this.watch = function(start, query) {
    this.onMessage(JSON.stringify({
      type: "watch",
      start: start,
      query: query,
      token: 1
    }));
  };

  this.query = function(start, query, token) {
    this.onMessage(JSON.stringify({
      type: "query",
      start: start,
      query: query,
      token: token
    }));
  };

  this.send = function (message) {
    this.messages.push(message);
  }
}

var thisUserCredential = {
  provider: "Test",
  id: "thisuser"
};

var otherUserCredential = {
  provider: "Test",
  id: "otheruser"
};

var thisUser;
var otherUser;

function authenticateFor(user) {
  return function authenticate(socket, done) {
    done(user);
  }
}

describe("DistributorServer", function() {
  var coordinatorProxy;
  var mongo;

  var topic = {
    type: "Yaca.Topic",
    name: "Space Paranoids"
  };
  
  var list = {
    name: "Chores"
  };

  before(function (done) {
    coordinatorProxy = {
      onError: function (error) {
        expect(error).to.equal('');
      }
    };
    mongo = new MongoProvider(url);
    mongo.init(coordinatorProxy);
    mongo.getUserFact(thisUserCredential, function (thisUserFact) {
      thisUser = thisUserFact;
      mongo.getUserFact(otherUserCredential, function (otherUserFact) {
        otherUser = otherUserFact;
        done();
      });
    });
  });

  beforeEach(function () {
    topic.createdAt = new Date().toJSON();
    topic.from = thisUser;
  });

  it("should send fact to endpoint", function (done) {
    var distributor = new JinagaDistributor(mongo, mongo, authenticateFor(thisUserCredential));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    mongo.whenQuiet(function () {
      proxy.watch({ name: "Chores" }, "S.list");
    });
    mongo.whenQuiet(function () {
      distributor.onReceived({ list: { name: "Chores" }, description: "Take out the trash" }, null);
    });
    mongo.whenQuiet(function () {
      expect(proxy.messages.length).to.equal(4);
      expect(JSON.parse(proxy.messages[0]).type).to.equal("loggedIn");
      expect(JSON.parse(proxy.messages[1])).to.eql({
        type: "fact",
        id: 2,
        fact: {
          name: "Chores"
        },
        token: 2122203819
      });
      expect(JSON.parse(proxy.messages[2])).to.eql({
        type: "fact",
        id: 4,
        fact: {
          list: {
            id: 2,
            hash: 2122203819
          },
          description: "Take out the trash"
        },
        token: -2014427633
      });
      expect(JSON.parse(proxy.messages[3])).to.eql({
        type: "done",
        token: 1
      });
      done();
    });
  });

  it("should allow facts in topics from this user", function (done) {
    var distributor = new JinagaDistributor(mongo, mongo, authenticateFor(thisUserCredential));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    mongo.whenQuiet(function () {
      proxy.watch(topic, "S.in F.type=\"Yaca.Post\"");
    });
    mongo.whenQuiet(function () {
      distributor.onReceived({
        type: "Yaca.Post",
        from: thisUser,
        in: topic
      }, thisUser, null);
    });
    mongo.whenQuiet(function () {
      expect(proxy.messages.length).to.equal(5);
      expect(JSON.parse(proxy.messages[0]).type).to.equal("loggedIn");
      expect(JSON.parse(proxy.messages[1]).type).to.equal("done");
      expect(JSON.parse(proxy.messages[2]).type).to.equal("fact");
      expect(JSON.parse(proxy.messages[2]).fact.type).to.equal("Jinaga.User");
      expect(JSON.parse(proxy.messages[3]).type).to.equal("fact");
      expect(JSON.parse(proxy.messages[3]).fact.type).to.equal("Yaca.Topic");
      expect(JSON.parse(proxy.messages[4]).type).to.equal("fact");
      expect(JSON.parse(proxy.messages[4]).fact.type).to.equal("Yaca.Post");
      done();
    });
  });

  it ("should disallow facts sent by another user", function (done) {
    var distributor = new JinagaDistributor(mongo, mongo, authenticateFor(thisUserCredential));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    mongo.whenQuiet(function () {
      proxy.watch(topic, "S.in F.type=\"Yaca.Post\"");
    });
    mongo.whenQuiet(function () {
      distributor.onReceived({
        type: "Yaca.Post",
        from: thisUser,
        in: topic
      }, otherUser, null);
    });
    mongo.whenQuiet(function () {
      expect(proxy.messages.length).to.equal(2);
      expect(JSON.parse(proxy.messages[0]).type).to.equal("loggedIn");
      expect(JSON.parse(proxy.messages[1]).type).to.equal("done");
      done();
    });
  });

  it ("should disallow facts in topics not from this user, especially when sent by another", function (done) {
    var distributor = new JinagaDistributor(mongo, mongo, authenticateFor(thisUserCredential));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    mongo.whenQuiet(function () {
      proxy.watch(topic, "S.in F.type=\"Yaca.Post\"");
    });
    mongo.whenQuiet(function () {
      distributor.onReceived({
        type: "Yaca.Post",
        from: otherUser,
        in: topic
      }, thisUser, null);
    });
    mongo.whenQuiet(function () {
      expect(proxy.messages.length).to.equal(2);
      expect(JSON.parse(proxy.messages[0]).type).to.equal("loggedIn");
      expect(JSON.parse(proxy.messages[1]).type).to.equal("done");
      done();
    });
  });

  it ("should disallow facts in topics not from this user", function (done) {
    var distributor = new JinagaDistributor(mongo, mongo, authenticateFor(thisUserCredential));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    mongo.whenQuiet(function () {
      proxy.watch(topic, "S.in F.type=\"Yaca.Post\"");
    });
    mongo.whenQuiet(function () {
      distributor.onReceived({
        type: "Yaca.Post",
        from: otherUser,
        in: topic
      }, otherUser, null);
    });
    mongo.whenQuiet(function () {
      expect(proxy.messages.length).to.equal(2);
      expect(JSON.parse(proxy.messages[0]).type).to.equal("loggedIn");
      expect(JSON.parse(proxy.messages[1]).type).to.equal("done");
      done();
    });
  });

  it("should not return existing facts in a predecessor to an unauthorized user", function (done) {
    var distributor = new JinagaDistributor(mongo, mongo, authenticateFor(otherUserCredential));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    mongo.whenQuiet(function () {
      distributor.onReceived({
        type: "Yaca.Post",
        from: thisUser,
        in: topic
      }, thisUser, null);
    });
    mongo.whenQuiet(function () {
      proxy.watch(topic, "S.in F.type=\"Yaca.Post\"");
    });
    mongo.whenQuiet(function () {
      expect(proxy.messages.length).to.equal(2);
      expect(JSON.parse(proxy.messages[0]).type).to.equal("loggedIn");
      expect(JSON.parse(proxy.messages[1]).type).to.equal("done");
      done();
    });
  });

  it ("should return existing facts in a predecessor to an authorized user", function (done) {
    var distributor = new JinagaDistributor(mongo, mongo, authenticateFor(thisUserCredential));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    mongo.whenQuiet(function () {
      distributor.onReceived({
        type: "Yaca.Post",
        from: thisUser,
        in: topic
      }, thisUser, null);
    });
    mongo.whenQuiet(function () {
      proxy.watch(topic, "S.in F.type=\"Yaca.Post\"");
    });
    mongo.whenQuiet(function () {
      expect(proxy.messages.length).to.equal(5);
      expect(JSON.parse(proxy.messages[0]).type).to.equal("loggedIn");
      expect(JSON.parse(proxy.messages[1]).type).to.equal("fact");
      expect(JSON.parse(proxy.messages[1]).fact.type).to.equal("Jinaga.User");
      expect(JSON.parse(proxy.messages[2]).type).to.equal("fact");
      expect(JSON.parse(proxy.messages[2]).fact.type).to.equal("Yaca.Topic");
      expect(JSON.parse(proxy.messages[3]).type).to.equal("fact");
      expect(JSON.parse(proxy.messages[3]).fact.type).to.equal("Yaca.Post");
      expect(JSON.parse(proxy.messages[4]).type).to.equal("done");
      done();
    });
  });

  it ("should query existing facts", function (done) {
    var distributor = new JinagaDistributor(mongo, mongo, authenticateFor(thisUserCredential));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    mongo.whenQuiet(function () {
      distributor.onReceived({
        type: "Yaca.Post",
        from: thisUser,
        in: topic
      }, thisUser, null);
    });
    mongo.whenQuiet(function () {
      proxy.query(topic, "S.in F.type=\"Yaca.Post\"", 1);
    });
    mongo.whenQuiet(function () {
      expect(proxy.messages.length).to.equal(5);
      expect(JSON.parse(proxy.messages[0]).type).to.equal("loggedIn");
      expect(JSON.parse(proxy.messages[1]).type).to.equal("fact");
      expect(JSON.parse(proxy.messages[1]).fact.type).to.equal("Jinaga.User");
      expect(JSON.parse(proxy.messages[2]).type).to.equal("fact");
      expect(JSON.parse(proxy.messages[2]).fact.type).to.equal("Yaca.Topic");
      expect(JSON.parse(proxy.messages[3]).type).to.equal("fact");
      expect(JSON.parse(proxy.messages[3]).fact.type).to.equal("Yaca.Post");
      expect(proxy.messages[4]).to.equal(JSON.stringify({ "type": "done", "token": 1 }));
      done();
    });
  });

  it ("should not return facts from query after it completes", function (done) {
    var distributor = new JinagaDistributor(mongo, mongo, authenticateFor(thisUserCredential));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    mongo.whenQuiet(function () {
      proxy.query(topic, "S.in F.type=\"Yaca.Post\"", 1);
    });
    mongo.whenQuiet(function () {
      distributor.onReceived({
        type: "Yaca.Post",
        from: thisUser,
        in: topic
      }, thisUser, null);
    });
    mongo.whenQuiet(function () {
      expect(proxy.messages.length).to.equal(2);
      expect(JSON.parse(proxy.messages[0]).type).to.equal("loggedIn");
      expect(proxy.messages[1]).to.equal(JSON.stringify({ "type": "done", "token": 1 }));
      done();
    });
  });

  it('should perform zig zag query', function (done) {
    var distributor = new JinagaDistributor(mongo, mongo, authenticateFor(thisUserCredential));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    mongo.whenQuiet(function () {
      distributor.onReceived({
        type: "Yaca.Post",
        from: thisUser,
        to: otherUser,
        in: topic
      }, thisUser, null);
    });
    mongo.whenQuiet(function () {
      distributor.onReceived({
        type: "Jinaga.User.Name",
        from: otherUser,
        value: 'Michael L Perry',
        prior: []
      }, otherUser, null);
    });
    mongo.whenQuiet(function () {
      proxy.query(topic, 'S.in F.type="Yaca.Post" P.to F.type="Jinaga.User" S.from F.type="Jinaga.User.Name"', 1);
    });
    mongo.whenQuiet(function () {
      expect(proxy.messages.length).to.equal(7);
      expect(JSON.parse(proxy.messages[0]).type).to.equal("loggedIn");
      expect(JSON.parse(proxy.messages[1]).type).to.equal("fact");
      expect(JSON.parse(proxy.messages[1]).fact.type).to.equal("Jinaga.User");
      expect(JSON.parse(proxy.messages[2]).type).to.equal("fact");
      expect(JSON.parse(proxy.messages[2]).fact.type).to.equal("Jinaga.User");
      expect(JSON.parse(proxy.messages[3]).type).to.equal("fact");
      expect(JSON.parse(proxy.messages[3]).fact.type).to.equal("Yaca.Topic");
      expect(JSON.parse(proxy.messages[4]).type).to.equal("fact");
      expect(JSON.parse(proxy.messages[4]).fact.type).to.equal("Yaca.Post");
      expect(JSON.parse(proxy.messages[5]).type).to.equal("fact");
      expect(JSON.parse(proxy.messages[5]).fact.type).to.equal("Jinaga.User.Name");
      expect(proxy.messages[6]).to.equal(JSON.stringify({ "type": "done", "token": 1 }));
      done();
    });
  })
});