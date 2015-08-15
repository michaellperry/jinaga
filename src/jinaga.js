if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function (require) {
  function Jinaga(){
    this.queries = [];
    this.messages = [];
  }

  Jinaga.prototype.fact = function(message) {
    this.messages.push(message);

    for (var i = 0; i < this.queries.length; i++) {
      this.queries[i].resultAdded(message);
    }
  }

  Jinaga.prototype.query = function query(start, clauses, resultAdded, resultRemoved) {
    this.queries.push({
      resultAdded: resultAdded
    });

    for (var i = 0; i < this.messages.length; i++) {
      resultAdded(this.messages[i]);
    }
  }

  return Jinaga;
});
