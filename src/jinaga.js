var queries = [];

function fact(message) {
  for (var i = 0; i < queries.length; i++) {
    queries[i].resultAdded(message);
  }
}

function query(start, clauses, resultAdded, resultRemoved) {
  queries.push({
    resultAdded: resultAdded
  });
}

module.exports = {
  fact: fact,
  query: query
};