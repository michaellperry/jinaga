var args = require('minimist')(process.argv.slice(2));
var port = args.port ? parseInt(args.port, 10) : 8888;

var JinagaDistributor = require("./jinaga.distributor.server.js");
//var MemoryProvider = require("./memory");
var MongoProvider = require("./jinaga.mongo");
var url = 'mongodb://localhost:27017/dev';

//var memory = new MemoryProvider();
var mongo = new MongoProvider(url);
var distributor = JinagaDistributor.listen(mongo, port);
