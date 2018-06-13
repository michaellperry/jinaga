import { expect } from 'chai';
import { describe, it } from 'mocha';

import { Jinaga } from '../src/jinaga';
import { parseQuery } from '../src/query/query-parser';

describe('Query parser', () => {

    const j = new Jinaga(null, null);

    function tasksInList(l: any) {
        l.type = 'List';
        return {
            type: 'Task',
            list: l
        };
    }

    function completionsInList(l: any) {
        l.type = 'List';
        return {
            type: 'Completion',
            task: {
                type: 'Task',
                list: l
            }
        };
    }

    function listOfTask(t: any) {
        t.has('list');
        t.type = 'Task';
        return t.list;
    }

    function listOfCompletion(c: any) {
        c.has('task').has('list');
        c.type = 'Completion';
        c.task.type = 'Task';
        return c.task.list;
    }

    function taskIsNotCompleted(t: any) {
        return j.not({
            type: 'Completion',
            task: t
        });
    }

    function taskIsCompleted(t: any) {
        return {
            type: 'Completion',
            task: t
        };
    }

    function uncompletedTasksInList(l: any) {
        l.type = 'List';
        return j.where({
            type: 'Task',
            list: l
        }, j.suchThat(taskIsNotCompleted));
    }

    function completedTasksInList(l: any) {
        l.type = 'List';
        return j.where({
            type: 'Task',
            list: l
        }, j.suchThat(taskIsCompleted));
    }

    function completedTasksInListWithArray(l: any) {
        l.type = 'List';
        return j.where({
            type: 'Task',
            list: [l]
        }, j.suchThat(taskIsCompleted));
    }

    function uncompletedTasksInListAlt(l: any) {
        l.type = 'List';
        return j.where({
            type: 'Task',
            list: l
        }, j.suchThat(j.not(taskIsCompleted)));
    }

    function completedTasksInListAlt(l: any) {
        l.type = 'List';
        return j.where({
            type: 'Task',
            list: l
        }, j.suchThat(j.not(taskIsNotCompleted)));
    }

    it('should parse to a successor query', function () {
        const query = parseQuery(j.suchThat(tasksInList));
        expect(query.toDescriptiveString()).to.equal('F.type="List" S.list F.type="Task"');
    });

    it('should find two successors', function () {
        var query = parseQuery(j.suchThat(completionsInList));
        expect(query.toDescriptiveString()).to.equal('F.type="List" S.list F.type="Task" S.task F.type="Completion"');
    });

    it('should find predecessor', function () {
        var query = parseQuery(j.suchThat(listOfTask));
        expect(query.toDescriptiveString()).to.equal('F.type="Task" P.list');
    });

    it('should find two predecessors', function () {
        var query = parseQuery(j.suchThat(listOfCompletion));
        expect(query.toDescriptiveString()).to.equal('F.type="Completion" P.task F.type="Task" P.list');
    });

    it('should parse a negative existential condition', function () {
        var query = parseQuery(j.suchThat(uncompletedTasksInList));
        expect(query.toDescriptiveString()).to.equal('F.type="List" S.list F.type="Task" N(S.task F.type="Completion")');
    });

    it('should parse a positive existential condition', function () {
        var query = parseQuery(j.suchThat(completedTasksInList));
        expect(query.toDescriptiveString()).to.equal('F.type="List" S.list F.type="Task" E(S.task F.type="Completion")');
    });

    it('should parse a negative outside of template function', function () {
        var query = parseQuery(j.suchThat(uncompletedTasksInListAlt));
        expect(query.toDescriptiveString()).to.equal('F.type="List" S.list F.type="Task" N(S.task F.type="Completion")');
    });

    it('should parse a double negative', function () {
        var query = parseQuery(j.suchThat(completedTasksInListAlt));
        expect(query.toDescriptiveString()).to.equal('F.type="List" S.list F.type="Task" E(S.task F.type="Completion")');
    });

    it('should chain to find siblings', function () {
        var query = parseQuery(j.suchThat(listOfTask).suchThat(uncompletedTasksInList));
        expect(query.toDescriptiveString()).to.equal('F.type="Task" P.list F.type="List" S.list F.type="Task" N(S.task F.type="Completion")');
    })

    it('should allow array with one predecessor', function () {
        var query = parseQuery(j.suchThat(completedTasksInListWithArray));
        expect(query.toDescriptiveString()).to.equal('F.type="List" S.list F.type="Task" E(S.task F.type="Completion")');
    });
});