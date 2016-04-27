import Interface = require('./interface');
import computeHash = Interface.computeHash;
import isPredecessor = Interface.isPredecessor;
import Coordinator = Interface.Coordinator;
import Query = Interface.Query;
import UserIdentity = Interface.UserIdentity;
import Join = Interface.Join;
import Pool = require("./pool");
import MongoGraph = require("./mongoGraph");
import MongoSave = require("./mongoSave");
import Keypair = require("keypair");
import Collections = require("./collections");
import _isEqual = Collections._isEqual;

var MongoDb = require('mongodb');
var MongoClient = MongoDb.MongoClient;

class MongoConnection {
    constructor(
        public db: any,
        public collection: any
    ) { }
}

class MongoProvider implements Interface.StorageProvider, Interface.KeystoreProvider {
    private coordinator: Coordinator;
    private count: number = 0;
    private pools: { [collectionName: string]: Pool<MongoConnection> } = {};
    private quiet: () => void;
    
    public constructor(
        public url: string
    ) { }

    public init(coordinator: Coordinator) {
        this.coordinator = coordinator;
        this.withCollection('successors', (collection, done) => {
            collection.createIndex({
                'hash': 1,
                'predecessors': 1
            }, {
                unique: true
            }, function (err) {
                if (err) {
                    coordinator.onError(err);
                }
                done();
            });
        })
    }
    
    public save(fact: Object, source: any) {
        this.withCollection("successors", (collection, done) => {
            MongoSave.saveFact(collection, fact, (error, saved) => {
                if (error) {
                    this.coordinator.onError(error);
                }
                else {
                    saved.forEach(f => {
                        this.coordinator.onSaved(f, source);
                    });
                }
                done();
            });
        });
    }
    
    public executeQuery(
        start: Object,
        query: Query,
        readerFact: Object,
        result: (error: string, facts: Array<Object>) => void
    ) {
        this.withCollection("successors", (collection, done) => {
            const processor = MongoGraph.parseSteps(collection, query.steps);
            processor(new MongoGraph.Point(start, computeHash(start)), (error, facts) => {
                if (error)
                    result(error, null);
                else
                    result(null, facts
                        .map(f => f.fact)
                        .filter(f => this.authorizeRead(f, readerFact)));
                done();
            });
        });
    }
    
    public sendAllFacts() {
    }
    
    public push(fact: Object) {
    }
    
    public dequeue(token: number, destination: any) {
    }
    
    public getUserFact(userIdentity: UserIdentity, done: (userFact: Object) => void) {
        if (!userIdentity) {
            done(null);
        }
        else {
            this.withCollection("users", (users, close: () => void) => {
                var publicKey = null;
                users.find({
                    provider: userIdentity.provider,
                    userId: userIdentity.id
                }).forEach((userDocument: any) => {
                    publicKey = userDocument.publicKey;
                }, (error: any) => {
                    if (error) {
                        this.coordinator.onError(error);
                        done(null);
                        close();
                    }
                    else {
                        if (publicKey) {
                            done({
                                type: "Jinaga.User",
                                publicKey: publicKey
                            });
                            close();
                        }
                        else {
                            var pair = Keypair({ bits: 1024 });
                            var privateKey = pair.private;
                            publicKey = pair.public;
                            users.insertOne({
                                provider: userIdentity.provider,
                                userId: userIdentity.id,
                                privateKey: privateKey,
                                publicKey: publicKey
                            }, (error, result) => {
                                if (error) {
                                    this.coordinator.onError(error.message);
                                    done(null);
                                    close();
                                }
                                else {
                                    done({
                                        type: "Jinaga.User",
                                        publicKey: publicKey
                                    });
                                    close();
                                }
                            });
                        }
                    }
                });
            });
        }
    }
    
    ///////////////////////////
    
    public whenQuiet(quiet: () => void) {
        if (this.count === 0) {
            quiet();
        }
        else {
            var prior = this.quiet;
            this.quiet = () => {
                if (prior) {
                    prior();
                    this.whenQuiet(quiet);
                }
                else
                    quiet();
            }
        }
    }
    
    ///////////////////////////

    private withCollection(collectionName:string, action:(collection:any, done:()=>void)=>void) {
        this.count++;
        if (!this.pools[collectionName]) {
            this.pools[collectionName] = new Pool<MongoConnection>(
                (done: (connection: MongoConnection) => void) => {
                    MongoClient.connect(this.url, (err, db) => {
                        if (err) {
                            this.coordinator.onError(err.message);
                            done(null);
                        }
                        else {
                            done(new MongoConnection(db, db.collection(collectionName)));
                        }
                    });
                },
                (connection: MongoConnection) => {
                    connection.db.close();
                }
            );
        }
        this.pools[collectionName].begin((connection: MongoConnection, done: () => void) => {
            action(connection.collection, () => {
                done();
                this.count--;
                if (this.count === 0 && this.quiet) {
                    var quiet = this.quiet;
                    this.quiet = null;
                    quiet();
                }
            });
        });
    }

    private authorizeRead(fact: Object, readerFact: Object) {
        if (!fact.hasOwnProperty("in")) {
            // Not in a locked fact
            return true;
        }
        var locked = fact["in"];
        if (!locked.hasOwnProperty("from")) {
            // Locked fact is not from a user, so no one has access
            return false;
        }
        var owner = locked["from"];
        if (_isEqual(owner, readerFact)) {
            // The owner has access.
            return true;
        }
        return false;
    }
}

export = MongoProvider;
