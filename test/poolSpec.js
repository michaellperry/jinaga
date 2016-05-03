var chai = require("chai");
var Pool = require("../node/pool").default;

var expect = chai.expect;

describe('Pool', function () {
    it('should create a connection', function (done){
        var c = {
            opened: false,
            closed: false
        };
        var p = new Pool(function createConnection(connectionCreated) {
            setTimeout(function () {
                c.opened = true;
                connectionCreated(c);
            }, 250);
        }, function closeConnection(connection) {
            c.closed = true;
        });
        
        p.begin(function (connection, close) {
            expect(c.opened).to.equal(true);
            expect(c.closed).to.equal(false);
            close();
            expect(c.closed).to.equal(true);
            done();
        });
    });
});
