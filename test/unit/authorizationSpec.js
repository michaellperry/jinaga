var chai = require("chai");
var JinagaDistributor = require("../../node/jinaga.distributor.server");
var MemoryProvider = require("../../node/memory");

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

describe("Authorization", function() {
  var coordinatorProxy;
  var memory;

  var topic = {
    type: "Yaca.Topic",
    name: "Space Paranoids"
  };

  before(function (done) {
    memory = new MemoryProvider();
    memory.getUserFact(thisUserCredential, function (thisUserFact) {
      thisUser = thisUserFact;
      memory.getUserFact(otherUserCredential, function (otherUserFact) {
        otherUser = otherUserFact;
        done();
      });
    });
  });

  beforeEach(function () {
    topic.createdAt = new Date().toJSON();
    topic.from = thisUser;
  });

  it ('should not return existing facts in a predecessor to an unauthorized user', function () {
    var distributor = new JinagaDistributor(memory, memory, authenticateFor(otherUserCredential));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    distributor.onReceived({
      type: "Yaca.Post",
      from: thisUser,
      in: topic
    }, thisUser, null);

    proxy.watch(topic, "S.in F.type=\"Yaca.Post\"");

    expect(proxy.messages.length).to.equal(2);
    expect(JSON.parse(proxy.messages[0]).type).to.equal("loggedIn");
    expect(JSON.parse(proxy.messages[1]).type).to.equal("done");
  });

  it ('should return facts in a predecessor open to everyone', function () {
    var distributor = new JinagaDistributor(memory, memory, authenticateFor(otherUserCredential));

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    distributor.onReceived({
      type: 'Yaca.Privilege',
      from: thisUser,
      privilege: {
        to: {
          type: 'Jinaga.Group',
          identifier: 'everyone'
        },
        read: topic
      }
    }, thisUser, null);
    distributor.onReceived({
      type: 'Yaca.Post',
      from: thisUser,
      in: topic
    }, thisUser, null);

    proxy.watch(topic, 'S.in F.type="Yaca.Post"');

    expect(proxy.messages.length).to.equal(5);
    expect(JSON.parse(proxy.messages[0]).type).to.equal('loggedIn');
    expect(JSON.parse(proxy.messages[1]).type).to.equal('fact');
    expect(JSON.parse(proxy.messages[2]).type).to.equal('fact');
    expect(JSON.parse(proxy.messages[3]).type).to.equal('fact');
    expect(JSON.parse(proxy.messages[4]).type).to.equal('done');
  });
});
