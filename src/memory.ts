/// <reference path="jinaga.ts" />

import Interface = require("./interface");
import StorageProvider = Interface.StorageProvider;
import NetworkProvider = Interface.NetworkProvider;
import Query = Interface.Query;
import Direction = Interface.Direction;
import Join = Interface.Join;
import Coordinator = Interface.Coordinator;
import PropertyCondition = Interface.PropertyCondition;
import _ = require("lodash");

class Node {
    successors: { [role: string]: Array<Node> } = {};

    constructor(
        public fact: Object,
        public predecessors: Object) {
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

class MemoryProvider implements StorageProvider {
    nodes: { [hash: number]: Array<Node>; } = {};
    queue: Array<{hash: number, fact: Object}> = [];
    coordinator: Coordinator;

    init(coordinator: Coordinator) {
        this.coordinator = coordinator;
    }

    save(fact: Object, source: any) {
        this.insertNode(fact, source);
    }

    executeQuery(
        start: Object,
        query: Query,
        result: (error: string, facts: Array<Object>) => void,
        thisArg: Object
    ) {

        var startingNode = this.findNode(start);
        if (!startingNode) {
            result.bind(thisArg)(null, []);
            return;
        }

        var nodes: Array<Node> = [startingNode];
        for (var index = 0; index < query.steps.length; index++) {
            var step = query.steps[index];

            if (nodes.length === 0) {
                break;
            }

            if (step instanceof Join) {
                var join = <Join>step;
                var nextNodes: Array<Node> = [];
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
                var template = { fact: {} };
                template.fact[propertyCondition.name] = propertyCondition.value;
                var nextNodes = _.filter(nodes, template);
                nodes = nextNodes;
            }
        }

        result.bind(thisArg)(null, _.pluck(nodes, "fact"));
    }

    sendAllFacts() {
        _.each(this.queue, (item: {hash: number, fact: Object}) => {
            this.coordinator.send(item.fact, null);
        });
    }

    push(fact:Object) {
        this.queue.push({ hash: this.computeHash(fact), fact: fact });
        if (this.coordinator)
            this.coordinator.send(fact, null);
    }

    private insertNode(fact: Object, source: any): Node {
        var hash = this.computeHash(fact);
        var array = this.nodes[hash];
        if (!array) {
            array = [];
            this.nodes[hash] = array;
        }
        var node = _.find(array, "fact", fact);
        if (!node) {
            var predecessors = {};
            for (var field in fact) {
                var value = fact[field];
                if (typeof(value) === "object") {
                    var predecessor = this.insertNode(value, source);
                    predecessors[field] = [ predecessor ];
                }
            }

            node = new Node(fact, predecessors);
            for (var role in predecessors) {
                var predecessorArray = <Array<Node>>predecessors[role];
                predecessorArray[0].addSuccessor(role, node);
            }
            array.push(node);
            this.coordinator.onSaved(fact, source);
        }
        return node;
    }

    private findNode(fact: Object): Node {
        var hash = this.computeHash(fact);
        var array = this.nodes[hash];
        if (!array) {
            return null;
        }

        return _.find(array, "fact", fact);
    }

    private computeHash(fact: Object): number {
        if (!fact)
            return 0;

        var hash = _.sum(_.map(_.pairs(fact), this.computeMemberHash, this));
        return hash;
    }

    private computeMemberHash(pair: [any]): number {
        var name = pair[0];
        var value = pair[1];

        var valueHash = 0;
        switch (typeof(value)) {
            case "string":
                valueHash = this.computeStringHash(value);
                break;
            case "number":
                valueHash = value;
                break;
            case "object":
                valueHash = this.computeHash(value);
                break;
            case "boolean":
                valueHash = value ? 1 : 0;
                break;
            default:
                throw new TypeError("Property " + name + " is a " + typeof(value));
        }

        var nameHash = this.computeStringHash(name);
        return (nameHash << 5) - nameHash + valueHash;
    }

    private computeStringHash(str: string): number {
        if (!str)
            return 0;

        var hash = 0;
        for (var index = 0; index < str.length; index++) {
            hash = (hash << 5) - hash + str.charCodeAt(index);
        }
        return hash;
    }
}

export = MemoryProvider;