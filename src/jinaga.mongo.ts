import Interface = require("./interface");
import StorageProvider = Interface.StorageProvider;
import Coordinator = Interface.Coordinator;
import Query = Interface.Query;
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;

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
        MongoClient.connect(this.url, function(err, db) {
            if (err) {
                this.coordinator.onError(err.message);
            }
            else {
                db.collection("facts").insertOne({
                    hash: 0,
                    fact: fact,
                    predecessors: []
                }, function(err, result) {
                    if (err) {
                        this.coordinator.onError(err.message);
                    }
                    else {
                        db.close();
                        this.coordinator.onSaved(fact, source);
                    }
                }.bind(this));
            }
        }.bind(this));
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
}

export = MongoProvider;
