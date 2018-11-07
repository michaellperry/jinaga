import { expect } from 'chai';
import { describe, it } from 'mocha';

import { ModelMap } from '../../src/watch/model-map';

class TestModel {
    constructor(
        public field: string
    ) {}
}

describe('ModelMap', () => {

    let map: ModelMap<TestModel> = null;
    const path = [{type: 'type', hash: 'hash'}];

    beforeEach(() => {
        map = new ModelMap<TestModel>();
    });

    it('should be empty', () => {
        expect(map.hasModel(path)).to.be.false;
    });

    it('should take model', () => {
        map.setModel(path, new TestModel('test'));
        expect(map.hasModel(path)).to.be.true;
    });

    it('should handle model after setting', () => {
        map.setModel(path, new TestModel('test'));
        let model: TestModel = null;
        map.withModel(path, m => {
            model = m;
        });
        expect(model).to.not.be.null;
        expect(model.field).to.equal('test');
    });

    it('should handle model before setting', () => {
        let model: TestModel = null;
        map.withModel(path, m => {
            model = m;
        });
        map.setModel(path, new TestModel('test'));
        expect(model).to.not.be.null;
        expect(model.field).to.equal('test');
    });

    it('should handle model before and after setting', () => {
        let model1: TestModel = null;
        let model2: TestModel = null;
        map.withModel(path, m => {
            model1 = m;
        });
        map.setModel(path, new TestModel('test'));
        map.withModel(path, m => {
            model2 = m;
        });
        expect(model1).to.not.be.null;
        expect(model1.field).to.equal('test');
        expect(model2).to.not.be.null;
        expect(model2.field).to.equal('test');
    });

    it('should remove model', () => {
        map.setModel(path, new TestModel('test'));
        const model = map.removeModel(path);
        expect(model).to.not.be.null;
        expect(model.field).to.equal('test');
        expect(map.hasModel(path)).to.be.false;
    });

    it('should take a function', () => {
        const map = new ModelMap<() => string>();
        map.setModel(path, () => 'Executed');
        let result: string = null;
        map.withModel(path, m => {
            result = m();
        });
        expect(result).to.equal('Executed');
    });

    it('should remove a function', () => {
        const map = new ModelMap<() => string>();
        map.setModel(path, () => 'Executed');
        const model = map.removeModel(path);
        let result = model();
        expect(result).to.equal('Executed');
        expect(map.hasModel(path)).to.be.false;
    });

});