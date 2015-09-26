import Interface = require("./interface");
import StorageProvider = Interface.StorageProvider;
import Coordinator = Interface.Coordinator;
import Query = Interface.Query;
import computeHash = Interface.computeHash;
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
        debug("Execute save \"" + this.role + "\" " + JSON.stringify(this.fact));
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
                if (typeof(value) === "object") {
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
        this.done(this);
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

        setTimeout(() => {
            result(null, []);
        }, 100);
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
