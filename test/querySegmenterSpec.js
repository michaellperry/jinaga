var mocha = require('mocha');
var chai = require('chai');
var Interface = require('../node/interface');
var splitSegments = require('../node/querySegmenter');

var expect = chai.expect;

describe('Query segmenter', function () {
    it('should accept an empty array', function () {
        var segments = splitSegments(new Interface.Query([]));
        expect(segments.length).to.equal(0);
    });
    it('should accept a successor', function () {
        var segments = splitSegments(Interface.fromDescriptiveString('S.parent'));
        expect(segments.length).to.equal(1);
        expect(segments[0].toDescriptiveString()).to.equal('S.parent');
    });
    it('should accept a predecessor', function () {
        var segments = splitSegments(Interface.fromDescriptiveString('P.parent'));
        expect(segments.length).to.equal(0);
    });
    it('should accept a successor with a field', function () {
        var segments = splitSegments(Interface.fromDescriptiveString('S.parent F.type="Type"'));
        expect(segments.length).to.equal(1);
        expect(segments[0].toDescriptiveString()).to.equal('S.parent F.type="Type"');
    });
    it('should ignore leading fields', function () {
        var segments = splitSegments(Interface.fromDescriptiveString('F.type="Type" S.parent'));
        expect(segments.length).to.equal(1);
        expect(segments[0].toDescriptiveString()).to.equal('S.parent');
    });
    it('should accept two successors with fields', function () {
        var segments = splitSegments(Interface.fromDescriptiveString('S.grandParent F.type="TypeParent" S.parent F.type="TypeChild"'));
        expect(segments.length).to.equal(2);
        expect(segments[0].toDescriptiveString()).to.equal('S.grandParent F.type="TypeParent"');
        expect(segments[1].toDescriptiveString()).to.equal('S.grandParent F.type="TypeParent" S.parent F.type="TypeChild"');
    });
    it('should continue through existential queries', function () {
        var segments = splitSegments(Interface.fromDescriptiveString('S.list F.type="Task" N(S.task F.type="Completion")'));
        expect(segments.length).to.equal(2);
        expect(segments[0].toDescriptiveString()).to.equal('S.list F.type="Task"');
        expect(segments[1].toDescriptiveString()).to.equal('S.list F.type="Task" S.task F.type="Completion"');
    });
    it('should fork at existential queries', function () {
        var segments = splitSegments(Interface.fromDescriptiveString('S.list F.type="Task" N(S.task F.type="Completion") P.assignee F.type="User" S.user F.type="Name"'));
        expect(segments.length).to.equal(3);
        expect(segments[0].toDescriptiveString()).to.equal('S.list F.type="Task"');
        expect(segments[1].toDescriptiveString()).to.equal('S.list F.type="Task" S.task F.type="Completion"');
        expect(segments[2].toDescriptiveString()).to.equal('S.list F.type="Task" P.assignee F.type="User" S.user F.type="Name"');
    });
    it('should skip segments that end in predecessors', function () {
        var segments = splitSegments(Interface.fromDescriptiveString('S.list F.type="Task" P.assignee F.type="User" S.user F.type="Name"'));
        expect(segments.length).to.equal(2);
        expect(segments[0].toDescriptiveString()).to.equal('S.list F.type="Task"');
        expect(segments[1].toDescriptiveString()).to.equal('S.list F.type="Task" P.assignee F.type="User" S.user F.type="Name"');
    });
    it('should accept leading predecessor', function () {
        var segments = splitSegments(Interface.fromDescriptiveString('P.assignee F.type="User" S.user F.type="Name"'));
        expect(segments.length).to.equal(1);
        expect(segments[0].toDescriptiveString()).to.equal('P.assignee F.type="User" S.user F.type="Name"');
    });
});