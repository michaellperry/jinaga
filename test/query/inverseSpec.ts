import { expect } from 'chai';

import { fromDescriptiveString } from '../../src/query/descriptive-string';
import { invertQuery } from '../../src/query/inverter';

describe("QueryInverter", function () {
    it("the identity query does not affect any others", function () {
        var inverses = invertQuery(fromDescriptiveString(""));
        expect(inverses.length).to.equal(0);
    });

    it("a predecessor query cannot affect anything: the successor does not yet exist", function () {
        var inverses = invertQuery(fromDescriptiveString("P.project"));
        expect(inverses.length).to.equal(0);
    });

    it("a successor query affects its predecessor; it adds the new fact itself", function () {
        var inverses = invertQuery(fromDescriptiveString("S.project F.type=\"Task\""));
        inverses.length.should.equal(1);
        inverses[0].affected.toDescriptiveString().should.equal("F.type=\"Task\" P.project");
        inverses[0].added.toDescriptiveString().should.equal("");
        expect(inverses[0].removed).to.be.null;
    });

    it("a grandchild query affects its grandparent", function () {
        var inverses = invertQuery(fromDescriptiveString("S.project S.task F.type=\"Completed\""));
        inverses.length.should.equal(1);
        inverses[0].affected.toDescriptiveString().should.equal("F.type=\"Completed\" P.task P.project");
        inverses[0].added.toDescriptiveString().should.equal("");
        expect(inverses[0].removed).to.be.null;
    });

    it("a grandchild query can have field conditions", function () {
        var inverses = invertQuery(fromDescriptiveString("F.type=\"Project\" S.project F.type=\"Task\" S.task F.type=\"Completion\""));
        inverses.length.should.equal(1);
        inverses[0].affected.toDescriptiveString().should.equal("F.type=\"Completion\" P.task F.type=\"Task\" P.project F.type=\"Project\"");
        inverses[0].added.toDescriptiveString().should.equal("");
        expect(inverses[0].removed).to.be.null;
    });

    it("a query may begin with a field condition", function () {
        var inverses = invertQuery(fromDescriptiveString("F.type=\"Project\" S.project F.type=\"Task\""));
        inverses.length.should.equal(1);
        inverses[0].affected.toDescriptiveString().should.equal("F.type=\"Task\" P.project F.type=\"Project\"");
        inverses[0].added.toDescriptiveString().should.equal("");
        expect(inverses[0].removed).to.be.null;
    });

    it("a field value is applied to the affected query", function () {
        var inverses = invertQuery(fromDescriptiveString("S.user F.type=\"Assignment\" P.project"));
        inverses.length.should.equal(1);

        inverses[0].affected.toDescriptiveString().should.equal("F.type=\"Assignment\" P.user");
        inverses[0].added.toDescriptiveString().should.equal("P.project");
        expect(inverses[0].removed).to.be.null;
    });

    it("an existential successor query affects the predecessor; it removes the child", function () {
        var inverses = invertQuery(fromDescriptiveString("F.type=\"Project\" S.project F.type=\"Task\" N(S.task F.type=\"TaskCompleted\")"));
        inverses.length.should.equal(2);
        inverses[0].affected.toDescriptiveString().should.equal("F.type=\"Task\" P.project F.type=\"Project\"");
        inverses[0].added.toDescriptiveString().should.equal("");
        expect(inverses[0].removed).to.be.null;
        inverses[1].affected.toDescriptiveString().should.equal("F.type=\"TaskCompleted\" P.task F.type=\"Task\" P.project F.type=\"Project\"");
        inverses[1].removed.toDescriptiveString().should.equal("F.type=\"TaskCompleted\" P.task");
        expect(inverses[1].added).to.be.null;
    });

    it("an existential query for successor is always false for a new fact", function () {
        var inverses = invertQuery(fromDescriptiveString("F.type=\"Project\" S.project F.type=\"Task\" E(S.task F.type=\"TaskCompleted\")"));
        inverses.length.should.equal(1);
        inverses[0].affected.toDescriptiveString().should.equal("F.type=\"TaskCompleted\" P.task F.type=\"Task\" P.project F.type=\"Project\"");
        inverses[0].added.toDescriptiveString().should.equal("F.type=\"TaskCompleted\" P.task");
        expect(inverses[0].removed).to.be.null;
    });

    it("added does not start with existential query", function () {
        var inverses = invertQuery(fromDescriptiveString('S.project F.type="Task" N(S.task F.type="TaskCompleted") N(S.oldTask F.type="Task.Migration")'));
        expect(inverses.map(i => ({
            appliedToType: i.appliedToType,
            affected: i.affected.toDescriptiveString(),
            added: i.added ? i.added.toDescriptiveString() : null,
            removed: i.removed ? i.removed.toDescriptiveString() : null
        }))).to.deep.equal([
            {
                appliedToType: 'Task',
                affected: 'F.type="Task" P.project',
                added: '',
                removed: null
            },
            {
                appliedToType: 'TaskCompleted',
                affected: 'F.type="TaskCompleted" P.task F.type="Task" P.project',
                added: null,
                removed: 'F.type="TaskCompleted" P.task N(S.oldTask F.type="Task.Migration")'
            },
            {
                appliedToType: 'Task.Migration',
                affected: 'F.type="Task.Migration" P.oldTask F.type="Task" P.project',
                added: null,
                removed: 'F.type="Task.Migration" P.oldTask'
            }
        ]);
    });

    it("first existential query is never satisfied", function () {
        var inverses = invertQuery(fromDescriptiveString('S.project F.type="Task" E(S.task F.type="TaskCompleted") N(S.oldTask F.type="Task.Migration")'));
        expect(inverses.map(i => ({
            appliedToType: i.appliedToType,
            affected: i.affected.toDescriptiveString(),
            added: i.added ? i.added.toDescriptiveString() : null,
            removed: i.removed ? i.removed.toDescriptiveString() : null
        }))).to.deep.equal([
            {
                appliedToType: 'TaskCompleted',
                affected: 'F.type="TaskCompleted" P.task F.type="Task" P.project',
                added: 'F.type="TaskCompleted" P.task N(S.oldTask F.type="Task.Migration")',
                removed: null
            },
            {
                appliedToType: 'Task.Migration',
                affected: 'F.type="Task.Migration" P.oldTask F.type="Task" P.project',
                added: null,
                removed: 'F.type="Task.Migration" P.oldTask'
            }
        ]);
    });

    it("second existential query is never satisfied", function () {
        var inverses = invertQuery(fromDescriptiveString('S.project F.type="Task" N(S.task F.type="TaskCompleted") E(S.oldTask F.type="Task.Migration")'));
        expect(inverses.map(i => ({
            appliedToType: i.appliedToType,
            affected: i.affected.toDescriptiveString(),
            added: i.added ? i.added.toDescriptiveString() : null,
            removed: i.removed ? i.removed.toDescriptiveString() : null
        }))).to.deep.equal([
            {
                appliedToType: 'TaskCompleted',
                affected: 'F.type="TaskCompleted" P.task F.type="Task" P.project',
                added: null,
                removed: 'F.type="TaskCompleted" P.task E(S.oldTask F.type="Task.Migration")'
            },
            {
                appliedToType: 'Task.Migration',
                affected: 'F.type="Task.Migration" P.oldTask F.type="Task" P.project',
                added: 'F.type="Task.Migration" P.oldTask',
                removed: null
            }
        ]);
    });
});
