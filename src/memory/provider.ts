/// <reference path="../jinaga.ts" />

import Keypair = require('keypair');

import { Coordinator } from '../coordinator/coordinator';
import { KeystoreProvider } from '../keystore/provider';
import { UserIdentity } from '../keystore/user-identity';
import { PersistenceProvider } from '../persistence/provider';
import { Direction, Quantifier } from '../query/enums';
import { Query } from '../query/query';
import { ExistentialCondition, Join, PropertyCondition, Step } from '../query/steps';
import { StorageProvider } from '../storage/provider';
import { _isEqual } from '../utility/collections';
import { computeHash, isPredecessor } from '../utility/fact';


class Node {
    successors: { [role: string]: Array<Node> } = {};

    constructor(
        public fact: { [key: string]: any },
        public predecessors: { [key: string]: Node[] }) {
    }

    addSuccessor(role: string, node: Node) {
        var array = this.successors[role];
        if (!array) {
            array = [];
            this.successors[role] = array;
        }
        array.push(node);
    }

    successorsIn(role: string): Array<Node> {
        return this.successors[role] || [];
    }

    predecessorsInRole(role: string): Array<Node> {
        return this.predecessors[role] || [];
    }
}

export class MemoryProvider implements StorageProvider, PersistenceProvider, KeystoreProvider {
    private nodes: { [hash: number]: Array<Node> } = {};
    private publicKeys: { [id: string]: string } = {};
    private queue: Array<{hash: number, fact: Object}> = [];
    private coordinator: Coordinator;

    init(coordinator: Coordinator) {
        this.coordinator = coordinator;
    }

    save(fact: Object, source: any) {
        this.insertNode(fact, source);
    }

    executeQuery(
        start: Object,
        query: Query,
        readerFact: Object,
        result: (error: string, facts: Array<Object>) => void
    ) {
        var startingNode = this.findNode(start);
        if (!startingNode) {
            result(null, []);
            return;
        }

        var nodes = this.queryNodes(startingNode, query.steps);

        var facts: Array<Object> = [];
        nodes.forEach(function (node) {
           facts.push(node.fact);
        });
        result(null, facts);
    }

    executePartialQuery(
        start: Object,
        query: Query,
        result: (error: string, facts: Array<Object>) => void
    ) {
        this.executeQuery(start, query, null, result);
    }

    getUserFact(userIdentity: UserIdentity, done: (userFact: Object) => void) {
        if (!userIdentity) {
            done(null);
        }
        else {
            var publicKey = this.publicKeys[userIdentity.id];
            if (!publicKey) {
                let pair = Keypair({ bits: 1024 });
                publicKey = pair.public;
                this.publicKeys[userIdentity.id] = publicKey;
            }
            done({
                type: "Jinaga.User",
                publicKey: publicKey
            });
        }
    }

    private queryNodes(startingNode: Node, steps:Array<Step>): Array<Node> {
        var nodes:Array<Node> = [startingNode];
        for (var index = 0; index < steps.length; index++) {
            var step = steps[index];

            if (nodes.length === 0) {
                break;
            }

            if (step instanceof Join) {
                var join = <Join>step;
                var nextNodes:Array<Node> = [];
                for (var nodeIndex in nodes) {
                    var node = nodes[nodeIndex];

                    nextNodes = nextNodes.concat(
                        join.direction === Direction.Successor
                            ? node.successorsIn(join.role)
                            : node.predecessorsInRole(join.role));
                }
                nodes = nextNodes;
            }
            else if (step instanceof PropertyCondition) {
                var propertyCondition = <PropertyCondition>step;
                var nextNodes:Array<Node> = [];
                nodes.forEach(node => {
                    if (node.fact[propertyCondition.name] == propertyCondition.value) {
                        nextNodes.push(node);
                    }
                });
                nodes = nextNodes;
            }
            else if (step instanceof ExistentialCondition) {
                var existentialCondition = <ExistentialCondition>step;
                var nextNodes:Array<Node> = [];
                nodes.forEach((node) => {
                    var subNodes = this.queryNodes(node, existentialCondition.steps);
                    if (existentialCondition.quantifier === Quantifier.Exists
                            ? subNodes.length > 0 : subNodes.length === 0) {
                        nextNodes.push(node);
                    }
                });
                nodes = nextNodes;
            }
        }
        return nodes;
    }

    sendAllFacts() {
        this.queue.forEach((item: {hash: number, fact: Object}) => {
            this.coordinator.send(item.fact, null);
        });
    }

    push(fact:Object) {
        this.queue.push({ hash: computeHash(fact), fact: fact });
        if (this.coordinator) {
            this.coordinator.send(fact, null);
            this.coordinator.onProgress(this.queue.length);
        }
    }

    dequeue(token:number, destination:any) {
        for (var position = this.queue.length - 1; position >= 0; position--) {
            if (this.queue[position].hash === token)
                this.queue.splice(position, 1);
        }
        if (this.coordinator)
            this.coordinator.onProgress(this.queue.length);
    }

    private findNodeWithFact(array: Array<Node>, fact: Object) : Node {
        for(var index = 0; index < array.length; index++) {
            if (_isEqual(array[index].fact, fact)) {
                return array[index];
            }
        }
        return null;
    }

    private insertNode(fact: { [key: string]: any }, source: any): Node {
        var hash = computeHash(fact);
        var array = this.nodes[hash];
        if (!array) {
            array = [];
            this.nodes[hash] = array;
        }
        var node = this.findNodeWithFact(array, fact);
        if (!node) {
            var predecessors: { [field: string]: Array<Node> }  = {};
            for (var field in fact) {
                var value = fact[field];
                if (isPredecessor(value)) {
                    var predecessor = this.insertNode(value, source);
                    predecessors[field] = [ predecessor ];
                }
                else if (Array.isArray(value) && value.every(v => isPredecessor(v))) {
                    predecessors[field] = value.map(v => this.insertNode(v, source));
                }
            }

            node = new Node(fact, predecessors);
            for (var role in predecessors) {
                var predecessorArray = <Array<Node>>predecessors[role];
                predecessorArray.forEach(pred => pred.addSuccessor(role, node));
            }
            array.push(node);
            this.coordinator.onSaved(fact, source);
        }
        return node;
    }

    private findNode(fact: Object): Node {
        var hash = computeHash(fact);
        var array = this.nodes[hash];
        if (!array) {
            return null;
        }

        return this.findNodeWithFact(array, fact);
    }
}