var chai = require("chai");
var Pool = require("../node/mongo/pool").Pool;

var expect = chai.expect;

describe('Pool', function () {
    var c;
    var p;
    
    beforeEach(function () {
        c = {
            opened: false,
            closed: false
        };
        p = new Pool(function createConnection(connectionCreated) {
            setTimeout(function () {
                c.opened = true;
                connectionCreated(c);
            }, 10);
        }, function closeConnection(connection) {
            c.closed = true;
        });
    });
    
    it('should create a connection', function (done){
        p.begin(function (connection, close) {
            expect(c.opened).to.equal(true);
            expect(c.closed).to.equal(false);
            close();
            done();
        });
    });
    
    it('should reuse a connection', function (done){
        p.begin(function (connection, close) {
            expect(c.opened).to.equal(true);
            expect(c.closed).to.equal(false);
            close();
            expect(c.closed).to.equal(false);
        });

        p.begin(function (connection, close) {
            expect(c.opened).to.equal(true);
            expect(c.closed).to.equal(false);
            close();
            done();
        });
    });
});
