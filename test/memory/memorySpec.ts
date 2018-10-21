import { expect } from 'chai';
import { describe, it } from 'mocha';

import { dehydrateReference, dehydrateFact, hydrate } from '../../src/fact/hydrate';
import { MemoryStore } from '../../src/memory/memory-store';
import { fromDescriptiveString } from '../../src/query/descriptive-string';

describe('Memory', function() {
    let memory: MemoryStore = null;

    beforeEach(function () {
        memory = new MemoryStore();
    });

    const chores = {
        type: 'List',
        name: 'Chores'
    };

    const task = {
        type: 'Task',
        list: chores,
        description: 'Empty the dishwasher'
    };

    const task2 = {
        type: 'Task',
        list: chores,
        description: 'Take out the trash'
    };

    const completion = {
        type: 'TaskComplete',
        completed: true,
        task: task
    };

    const completionWithArray = {
        type: 'TaskComplete',
        completed: true,
        task: [task]
    };

    const completionForward = {
        type: 'TaskComplete',
        completed: true,
        task: [task, task2]
    };

    const completionBackward = {
        type: 'TaskComplete',
        completed: true,
        task: [task2, task]
    };

    var query = fromDescriptiveString('S.list');

    it('should return no results when has no facts', async () => {
        const results = await memory.query(dehydrateReference(chores), query);
        expect(results.length).to.equal(0);
    });

    it('should return one result when has a matching fact', async () => {
        await memory.save(dehydrateFact(chores));
        const task = dehydrateFact({
            type: 'Task',
            list: chores,
            description: 'Take out the trash'
        });
        await memory.save(task);

        const results = await memory.query(dehydrateReference(chores), query);
        expect(results.length).to.equal(1);
        expect(results[0].length).to.equal(1);
        expect(results[0][0].hash).to.equal(task[1].hash);
    });

    it('should add nested messages', async () => {
        const task = dehydrateFact({
            type: 'Task',
            list: chores,
            description: 'Take out the trash'
        });
        await memory.save(task);

        const results = await memory.query(dehydrateReference(chores), query);
        expect(results.length).to.equal(1);
        expect(results[0].length).to.equal(1);
        expect(results[0][0].hash).to.equal(task[1].hash);
    });

    it('should compare based on value', async () => {
        const task = dehydrateFact({
            type: 'Task',
            list: { type: 'List', name: 'Chores' },
            description: 'Take out the trash'
        });
        await memory.save(task);

        const results = await memory.query(dehydrateReference(chores), query);
        expect(results.length).to.equal(1);
        expect(results[0].length).to.equal(1);
        expect(results[0][0].hash).to.equal(task[1].hash);
    });

    it('should not match if predecessor is different', async () => {
        await memory.save(dehydrateFact({
            type: 'Task',
            list: { type: 'List', name: 'Fun' },
            description: 'Play XBox'
        }));

        const results = await memory.query(dehydrateReference(chores), query);
        expect(results.length).to.equal(0);
    });

    it('should find grandchildren', async () => {
        const completionPath = dehydrateFact(completion);
        await memory.save(completionPath);

        const results = await memory.query(dehydrateReference(chores), fromDescriptiveString('S.list S.task'));
        expect(results.length).to.equal(1);
        expect(results[0].length).to.equal(2);
        expect(results[0][1].hash).to.equal(completionPath[2].hash);
    });

    it('should find grandchildren with array', async () => {
        const completionPath = dehydrateFact(completionWithArray);
        await memory.save(completionPath);

        const results = await memory.query(dehydrateReference(chores), fromDescriptiveString('S.list S.task'));
        expect(results.length).to.equal(1);
        expect(results[0].length).to.equal(2);
        expect(results[0][1].hash).to.equal(completionPath[2].hash);
    });

    it('should find grandparents', async () => {
        const completionPath = dehydrateFact(completion);
        await memory.save(completionPath);

        const results = await memory.query(dehydrateReference(completion), fromDescriptiveString('P.task P.list'));
        expect(results.length).to.equal(1);
        expect(results[0].length).to.equal(2);
        expect(results[0][1].hash).to.equal(completionPath[0].hash);
    });

    it('should match based on field values', async () => {
        const completionPath = dehydrateFact(completion);
        await memory.save(completionPath);

        const results = await memory.query(dehydrateReference(completion), fromDescriptiveString('P.task F.type="Task" P.list F.type="List"'));
        expect(results.length).to.equal(1);
        expect(results[0].length).to.equal(2);
        expect(results[0][1].hash).to.equal(completionPath[0].hash);
    });

    it('should not match if final field values are different', async () => {
        await memory.save(dehydrateFact(completion));

        const results = await memory.query(dehydrateReference(completion), fromDescriptiveString(
            'P.task F.type="Task" P.list F.type="No Match"'
        ));
        expect(results.length).to.equal(0);
    });

    it('should not match if interior field values are different', async () => {
        await memory.save(dehydrateFact(completion));

        const results = await memory.query(dehydrateReference(completion), fromDescriptiveString(
            'P.task F.type="No Match" P.list F.type="List"'
        ));
        expect(results.length).to.equal(0);
    });

    it('should not match not exists if completion exists', async () => {
        await memory.save(dehydrateFact(completion));

        const results = await memory.query(dehydrateReference(chores), fromDescriptiveString(
            'S.list N(S.task)'
        ));
        expect(results.length).to.equal(0);
    });

    it('should match not exists if completion does not exist', async () => {
        await memory.save(dehydrateFact(task));

        const results = await memory.query(dehydrateReference(chores), fromDescriptiveString(
            'S.list N(S.task)'
        ));
        expect(results.length).to.equal(1);
    });

    it('should match exists if completion exists', async () => {
        await memory.save(dehydrateFact(completion));

        const results = await memory.query(dehydrateReference(chores), fromDescriptiveString(
            'S.list E(S.task)'
        ));
        expect(results.length).to.equal(1);
    });

    it('should not match exists if completion does not exist', async () => {
        await memory.save(dehydrateFact(task));

        const results = await memory.query(dehydrateReference(chores), fromDescriptiveString(
            'S.list E(S.task)'
        ));
        expect(results.length).to.equal(0);
    });

    it('existential condition works with field conditions negative', async () => {
        await memory.save(dehydrateFact(task));

        const results = await memory.query(dehydrateReference(chores), fromDescriptiveString(
            'F.type="List" S.list F.type="Task" N(S.task F.type="TaskComplete")'
        ));
        expect(results.length).to.equal(1);
    });

    it('existential condition works with field conditions positive', async () => {
        await memory.save(dehydrateFact(completion));

        const results = await memory.query(dehydrateReference(chores), fromDescriptiveString(
            'F.type="List" S.list F.type="Task" N(S.task F.type="TaskComplete")'
        ));
        expect(results.length).to.equal(0);
    });

    it('should find successor based on array with multiple entries', async () => {
        await memory.save(dehydrateFact(completionForward));

        const results = await memory.query(dehydrateReference(task), fromDescriptiveString(
            'F.type="Task" S.task F.type="TaskComplete"'
        ));
        expect(results.length).to.equal(1);
    });

    it('order of predecessors should not matter', async () => {
        await memory.save(dehydrateFact(completionForward));
        await memory.save(dehydrateFact(completionBackward));

        const results = await memory.query(dehydrateReference(task), fromDescriptiveString(
            'S.task'
        ));
        expect(results.length).to.equal(1);
    });
});
