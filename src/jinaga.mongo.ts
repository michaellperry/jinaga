import Interface = require('./interface');
import computeHash = Interface.computeHash;
import isPredecessor = Interface.isPredecessor;
import Coordinator = Interface.Coordinator;
import Query = Interface.Query;
import UserIdentity = Interface.UserIdentity;
import Join = Interface.Join;
import MongoGraph = require('./mongoGraph');
import MongoSave = require('./mongoSave');
import Keypair = require('keypair');
import Collections = require('./collections');
import _isEqual = Collections._isEqual;

import Pool from './pool';

var MongoDb = require('mongodb');
var MongoClient = MongoDb.MongoClient;

class MongoConnection {
    constructor(
        public db: any,
        public collection: any
    ) { }
}

class MongoProvider implements Interface.PersistenceProvider, Interface.KeystoreProvider {
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
                collection.createIndex({
                    'predecessors.role': 1,
                    'predecessors.hash': 1,
                    'fact.type': 1
                }, function (err) {
                    if (err) {
                        coordinator.onError(err);
                    }
                    collection.createIndex({
                        'hash': 1
                    }, function (err) {
                        if (err) {
                            coordinator.onError(err);
                        }
                        collection.createIndex({
                            'predecessors.hash': 1
                        }, function (err) {
                            if (err) {
                                coordinator.onError(err);
                            }
                            done();
                        });
                    });
                });
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

    private getPredecessors(fact: Object): Array<Object> {
        let predecessors: Array<Object> = [];
        for (var field in fact) {
            var value = fact[field];
            if (isPredecessor(value)) {
                predecessors.push(value);
            }
            else if (Array.isArray(value) && value.every(v => isPredecessor(v))) {
                value.forEach(v => {
                    predecessors.push(v);
                });
            }
        }
        return predecessors;
    }
    
    public executePartialQuery(
        start: Object,
        query: Query,
        result: (error: string, facts: Array<Object>) => void
    ) {
        this.withCollection("successors", (collection, done) => {
            const processor = MongoGraph.pipelineProcessor(collection, query.steps);
            processor(new MongoGraph.Point(start, computeHash(start)), (error, facts) => {
                if (error)
                    result(error, []);
                else
                    result(null, facts
                        .map(f => f.fact));
                done();
            });
        });
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
}

export = MongoProvider;
