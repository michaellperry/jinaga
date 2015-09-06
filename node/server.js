var JinagaDistributor = require("./jinaga.distributor.server.js");
var MemoryProvider = require("./memory");

var memory = new MemoryProvider();
var distributor = JinagaDistributor.listen(memory, 80);
