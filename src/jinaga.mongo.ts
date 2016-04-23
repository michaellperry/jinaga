import Interface = require('./interface');
import computeHash = Interface.computeHash;
import isPredecessor = Interface.isPredecessor;
import Coordinator = Interface.Coordinator;
import Query = Interface.Query;
import UserIdentity = Interface.UserIdentity;
import Join = Interface.Join;
import Pool = require("./pool");
import buildPipeline = require('./mongoPipelineBuilder');
import Keypair = require("keypair");

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
    private pool: Pool<MongoConnection> = null;
    private quiet: () => void;
    
    public constructor(
        public url: string
    ) { }

    public init(coordinator: Coordinator) {
        this.coordinator = coordinator;
        this.withCollection('successors', (collection, done) => {
            collection.createIndex({
                'hash': 1,
                'role': 1,
                'successorHash': 1
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
        for (var field in fact) {
            var value = fact[field];
            if (isPredecessor(value)) {
                this.saveSuccessor(value, field, fact, source);
            }
            else if (Array.isArray(value) && value.every(v => isPredecessor(v))) {
                value.forEach(v => {
                    this.saveSuccessor(v, field, fact, source);
                });
            }
        }
    }
    
    public executeQuery(
        start: Object,
        query: Query,
        readerFact: Object,
        result: (error: string, facts: Array<Object>) => void
    ) {
        //console.log(query.toDescriptiveString());
        var startHash = computeHash(start);
        //console.log("startHash: " + startHash);
        this.withCollection("successors", (collection, done) => {
            collection
                .aggregate(buildPipeline(startHash, query))
                .toArray((err, documents) => {
                //console.log(JSON.stringify(documents));
                result(
                    err ? err.message : null,
                    documents ? documents.map(d => d.successor) : null);
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
                            }, (error: string, result) => {
                                if (error) {
                                    this.coordinator.onError(error);
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
        if (!this.pool) {
            this.pool = new Pool<MongoConnection>(
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
        this.pool.begin((connection: MongoConnection, done: () => void) => {
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
    
    private saveSuccessor(
        predecessor: Object,
        role: string,
        successor: Object,
        source: any) {
        var document = {
            hash: computeHash(predecessor),
            role: role,
            successorHash: computeHash(successor),
            successor: successor
        };
        this.withCollection("successors", (collection, done) => {
            collection.insertOne(document, (err) => {
                if (err) {
                    if (err.code != 11000) {
                        this.coordinator.onError(err.message);
                    }
                }
                else {
                    this.save(predecessor, source);
                }
                done();
            });
        });
    }
}

export = MongoProvider;
