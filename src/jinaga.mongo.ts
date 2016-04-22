import Interface = require('./interface');
import computeHash = Interface.computeHash;
import isPredecessor = Interface.isPredecessor;
import Coordinator = Interface.Coordinator;
import Query = Interface.Query;
import UserIdentity = Interface.UserIdentity;
import Pool = require("./pool");
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
        var successorHash = computeHash(fact);
        for (var field in fact) {
            var predecessor = fact[field];
            var predecessorHash = computeHash(predecessor);
            if (isPredecessor(predecessor)) {
                var document = {
                    hash: predecessorHash,
                    role: field,
                    successorHash: successorHash,
                    successor: fact
                };
                this.withCollection("successors", (collection, done) => {
                    collection.insertOne(document, done);
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
        result('Not implemented', []);
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
}

export = MongoProvider;
