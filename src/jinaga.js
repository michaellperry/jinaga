function Jinaga(){
  this.queries = [];
}

Jinaga.prototype.fact = function(message) {
  for (var i = 0; i < this.queries.length; i++) {
    this.queries[i].resultAdded(message);
  }
}

Jinaga.prototype.query = function query(start, clauses, resultAdded, resultRemoved) {
  this.queries.push({
    resultAdded: resultAdded
  });
}

module.exports = Jinaga;