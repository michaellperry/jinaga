var chai = require("chai");
var JinagaDistributor = require("../node/jinaga.distributor.server");
var MemoryProvider = require("../node/memory");

var should = chai.should();

function SocketProxy() {
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

describe("DistributorServer", function() {
  it("should send fact to endpoint", function () {
    var distributor = new JinagaDistributor(new MemoryProvider());

    var proxy = new SocketProxy();
    distributor.onConnection(proxy);
    proxy.watch({
      name: "Chores"
    }, "S.list");
    distributor.onReceived({ list: { name: "Chores" }, description: "Take out the trash" }, null);
    proxy.message.should.equal("{\"type\":\"fact\",\"fact\":{\"list\":{\"name\":\"Chores\"},\"description\":\"Take out the trash\"}}");
  });
});