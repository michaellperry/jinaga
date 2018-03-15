var chai = require('chai');
var parse = require('../node/query/parser').parse;
var Jinaga = require('../node/jinaga');

var should = chai.should();

describe('QueryParser', function() {

  var j;

  function tasksInList(l) {
    l.type = 'List';
    return {
      type: 'Task',
      list: l
    };
  }

  function completionsInList(l) {
    l.type = 'List';
    return {
      type: 'Completion',
      task: {
        type: 'Task',
        list: l
      }
    };
  }

  function listOfTask(t) {
    t.has('list');
    t.type = 'Task';
    return t.list;
  }

  function listOfCompletion(c) {
    c.has('task').has('list');
    c.type = 'Completion';
    c.task.type = 'Task';
    return c.task.list;
  }

  function taskIsNotCompleted(t) {
    return j.not({
      type: 'Completion',
      task: t
    });
  }

  function taskIsCompleted(t) {
    return {
      type: 'Completion',
      task: t
    };
  }

  function uncompletedTasksInList(l) {
    l.type = 'List';
    return j.where({
      type: 'Task',
      list: l
    }, [taskIsNotCompleted]);
  }

  function completedTasksInList(l) {
    l.type = 'List';
    return j.where({
      type: 'Task',
      list: l
    }, [taskIsCompleted]);
  }

  function completedTasksInListWithArray(l) {
    l.type = 'List';
    return j.where({
      type: 'Task',
      list: [l]
    }, [taskIsCompleted]);
  }

  function uncompletedTasksInListAlt(l) {
    l.type = 'List';
    return j.where({
      type: 'Task',
      list: l
    }, [j.not(taskIsCompleted)]);
  }

  function completedTasksInListAlt(l) {
    l.type = 'List';
    return j.where({
      type: 'Task',
      list: l
    }, [j.not(taskIsNotCompleted)]);
  }

  beforeEach(function () {
    j = new Jinaga();
  });

  it('should parse to a successor query', function () {
    var query = parse([tasksInList]);
    query.toDescriptiveString().should.equal('F.type="List" S.list F.type="Task"');
  });

  it('should find two successors', function () {
    var query = parse([completionsInList]);
    query.toDescriptiveString().should.equal('F.type="List" S.list F.type="Task" S.task F.type="Completion"');
  });

  it('should find predecessor', function () {
    var query = parse([listOfTask]);
    query.toDescriptiveString().should.equal('F.type="Task" P.list');
  });

  it('should find two predecessors', function () {
    var query = parse([listOfCompletion]);
    query.toDescriptiveString().should.equal('F.type="Completion" P.task F.type="Task" P.list');
  });

  it('should parse a negative existential condition', function () {
    var query = parse([uncompletedTasksInList]);
    query.toDescriptiveString().should.equal('F.type="List" S.list F.type="Task" N(S.task F.type="Completion")');
  });

  it('should parse a positive existential condition', function () {
    var query = parse([completedTasksInList]);
    query.toDescriptiveString().should.equal('F.type="List" S.list F.type="Task" E(S.task F.type="Completion")');
  });

  it('should parse a negative outside of template function', function () {
    var query = parse([uncompletedTasksInListAlt]);
    query.toDescriptiveString().should.equal('F.type="List" S.list F.type="Task" N(S.task F.type="Completion")');
  });

  it('should parse a double negative', function () {
    var query = parse([completedTasksInListAlt]);
    query.toDescriptiveString().should.equal('F.type="List" S.list F.type="Task" E(S.task F.type="Completion")');
  });

  it('should chain to find siblings', function () {
    var query = parse([listOfTask, uncompletedTasksInList]);
    query.toDescriptiveString().should.equal('F.type="Task" P.list F.type="List" S.list F.type="Task" N(S.task F.type="Completion")');
  })

  it('should allow array with one predecessor', function () {
    var query = parse([completedTasksInListWithArray]);
    query.toDescriptiveString().should.equal('F.type="List" S.list F.type="Task" E(S.task F.type="Completion")');
  });
});
