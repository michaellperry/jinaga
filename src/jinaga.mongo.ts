import Interface = require("./interface");
import StorageProvider = Interface.StorageProvider;
import Coordinator = Interface.Coordinator;
import Query = Interface.Query;
import Join = Interface.Join;
import PropertyCondition = Interface.PropertyCondition;
import computeHash = Interface.computeHash;
import isPredecessor = Interface.isPredecessor;
import _ = require("lodash");

//import Debug = require("debug");
//var debug = Debug("jinaga.mongo");
var debug = function(str) { console.log(str); };

var MongoDb = require('mongodb');
var MongoClient = MongoDb.MongoClient;
var ObjectId = MongoDb.ObjectID;

class MongoSave {
    public hash: number;
    public isDone: boolean = false;
    public id = null;
    public predecessors: Array<MongoSave> = [];

    constructor(
        public coordinator: Coordinator,
        public role: string,
        public fact: Object,
        public source: any,
        public collection: any,
        public done: (MongoSave) => void) {
    }

    execute() {
        debug("Saving \"" + this.role + "\" " + JSON.stringify(this.fact));

        this.hash = computeHash(this.fact);
        this.collection.find({ hash: this.hash })
            .forEach(this.onFound.bind(this), this.onFindFinished.bind(this));
    }

    private onFound(document) {
        debug("Found " + JSON.stringify((document)));

        if (_.isEqual(this.fact, document.fact)) {
            debug("It's a match");
            this.isDone = true;
            this.id = document._id;
            this.done(this);
        }
    }

    private onFindFinished(err) {
        if (err) {
            this.coordinator.onError(err.message);
            this.isDone = true;
            this.done(this);
        }
        else if (!this.isDone) {
            debug("No match found");

            for (var field in this.fact) {
                var value = this.fact[field];
                if (isPredecessor(value)) {
                    var save = new MongoSave(
                        this.coordinator,
                        field,
                        value,
                        this.source,
                        this.collection,
                        this.onSaved.bind(this));
                    this.predecessors.push(save);
                    save.execute();
                }
            }
            if (this.predecessors.length === 0) {
                this.gather();
            }
        }
    }

    private onSaved(predecessor: MongoSave) {
        if (this.predecessors.every((predecessor) => predecessor.isDone)) {
            this.gather();
        }
    }

    private gather() {
        var predecessors = this.predecessors.map((predecessor) =>
            ({ role: predecessor.role, id: predecessor.id }));
        this.collection.insertOne({
            hash: this.hash,
            fact: this.fact,
            predecessors: predecessors
        }, this.onSaveFinished.bind(this));
    }

    private onSaveFinished(err, result) {
        debug("Saved " + JSON.stringify(this.fact));

        if (err) {
            this.coordinator.onError(err.message);
        }
        else {
            this.id = result.ops[0]._id;
        }
        this.isDone = true;
        this.coordinator.onSaved(this.fact, this.source);
        this.done(this);
    }
}

interface PipelineStep {
    join(id: any, fact: Object, predecessors: Array<any>);
    done();
}

/////
class StartStep {
    constructor(
        private next: PipelineStep,
        private collection: any,
        private error: (string) => void
    ) { }

    execute(fact: Object) {
        var hash = computeHash(fact);
        this.collection.find({ hash: hash })
            .forEach(this.onFound.bind(this), this.onFinished.bind(this));
    }

    private onFound(document) {
        debug("Starting at " + JSON.stringify(document));
        this.next.join(document._id, document.fact, document.predecessors);
    }

    private onFinished(err) {
        if (err)
            this.error(err.message);
        else
            this.next.done();
    }
}

/////
class GatherStep implements PipelineStep {
    private facts: Array<Object> = [];

    constructor(
        private onDone: (facts: Array<Object>) => void
    ) { }

    join(id:any, fact:Object, predecessors:Array<any>) {
        this.facts.push(fact);
    }

    done() {
        debug("Pipeline finished");
        this.onDone(this.facts);
    }
}

/////
class PredecessorStep implements PipelineStep {
    constructor(
        private next: PipelineStep,
        private role: string
    ) { }

    join(id: any, fact: Object, predecessors: Array<any>) {
        for(var index = 0; index < predecessors.length; index++) {
            var predecessor = predecessors[index];
            if (predecessor.role === this.role) {
                debug("P." + this.role + ": " + predecessor.id);
                this.next.join(predecessor.id, null, null);
            }
        }
    }

    done() {
        this.next.done();
    }
}

/////
class SuccessorStep implements PipelineStep {
    private isDone: boolean;
    private count: number = 0;

    constructor(
        private next: PipelineStep,
        private role: string,
        private collection: any,
        private error: (string) => void
    ) { }

    join(id:any, fact:Object, predecessors:Array<any>) {
        this.count++;
        this.collection.find({
            predecessors: { $in: [{ role: this.role, id: id }] }
        }).forEach(this.onFound.bind(this), this.onFinished.bind(this));
    }

    private onFound(document) {
        debug("S." + this.role + ": " + JSON.stringify(document));
        this.next.join(document._id, document.fact, document.predecessors);
    }

    private onFinished(err) {
        if (err) {
            this.error(err.message);
        }
        else {
            this.count--;
            if (this.isDone && this.count === 0)
                this.next.done();
        }
    }

    done() {
        this.isDone = true;
        if (this.count === 0)
            this.next.done();
    }
}

class MongoProvider implements Interface.StorageProvider {
    private url: string;
    private coordinator: Coordinator;

    constructor(url: string) {
        this.url = url;
    }

    init(coordinator:Coordinator) {
        this.coordinator = coordinator;
    }

    sendAllFacts() {
    }

    push(fact:Object) {
    }

    save(fact:Object, source:any) {
        var hash = computeHash(fact);
        this.withCollection((facts, done: () => void) => {
            var save = new MongoSave(
                this.coordinator,
                "",
                fact,
                source,
                facts,
                (p) => done()
            );
            save.execute();
        });
    }

    executeQuery(
        start:Object,
        query:Query,
        result:(error: string, facts: Array<Object>) => void,
        thisArg:Object) {

        this.withCollection((facts, done: () => void) => {
            var isComplete = false;
            var onError = function(error: string) {
                if (!isComplete)
                    result(error, []);
                isComplete = true;
            };

            var step: PipelineStep = new GatherStep((facts: Array<Object>) => {
                if (!isComplete)
                    result(null, facts);
                isComplete = true;
            });
            var join = <Join>query.steps[0];
            if (join.direction === Interface.Direction.Predecessor) {
                step = new PredecessorStep(step, join.role);
            }
            else {
                step = new SuccessorStep(step, join.role, facts, onError);
            }
            var startStep = new StartStep(step, facts, onError);
            startStep.execute(start);
        })
    }

    private withCollection(action: (facts, done: () => void) => void) {
        MongoClient.connect(this.url, (err, db) => {
            if (err) {
                this.coordinator.onError(err.message);
            }
            else {
                action(db.collection("facts"), () => {
                   db.close();
                });
            }
        });
    }
}

export = MongoProvider;
