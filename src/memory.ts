/// <reference path="jinaga.ts" />

import Interface = require("./interface");
import StorageProvider = Interface.StorageProvider;
import NetworkProvider = Interface.NetworkProvider;
import Query = Interface.Query;
import Direction = Interface.Direction;
import Join = Interface.Join;
import PropertyCondition = Interface.PropertyCondition;
import _ = require("lodash");

class Node {
    successors: { [role: string]: Array<Node> } = {};

    constructor(
        public message: Object,
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
    network: NetworkProvider;

    save(
        message: Object,
        enqueue: Boolean,
        result: (error: string, saved: Array<Object>) => void,
        thisArg: Object
    ) {

        var saved = this.insertNode(message).saved;
        if (saved && enqueue) {
            this.queue.push({ hash: this.computeHash(message), fact: message });
            if (this.network)
                this.network.fact(message);
        }
        result.bind(thisArg)(null, saved);
    }

    executeQuery(
        start: Object,
        query: Query,
        result: (error: string, messages: Array<Object>) => void,
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
                var template = { message: {} };
                template.message[propertyCondition.name] = propertyCondition.value;
                var nextNodes = _.filter(nodes, template);
                nodes = nextNodes;
            }
        }

        result.bind(thisArg)(null, _.pluck(nodes, "message"));
    }

    sync(network: NetworkProvider) {
        this.network = network;
        _.each(this.queue, function (item: {hash: number, fact: Object}) {
            this.network.fact(item.fact);
        }, this);
    }

    private insertNode(message: Object): {node: Node, saved: Array<Object>} {
        var hash = this.computeHash(message);
        var array = this.nodes[hash];
        if (!array) {
            array = [];
            this.nodes[hash] = array;
        }
        var node = _.find(array, "message", message);
        var saved: Array<Object> = [];
        if (!node) {
            var predecessors = {};
            for (var field in message) {
                var value = message[field];
                if (typeof(value) === "object") {
                    var result = this.insertNode(value);
                    var predecessor = result.node;
                    saved = saved.concat(result.saved);
                    predecessors[field] = [ predecessor ];
                }
            }

            node = new Node(message, predecessors);
            for (var role in predecessors) {
                var predecessorArray = <Array<Node>>predecessors[role];
                predecessorArray[0].addSuccessor(role, node);
            }
            array.push(node);
            saved.push(message);
        }
        return {node, saved};
    }

    private findNode(message: Object): Node {
        var hash = this.computeHash(message);
        var array = this.nodes[hash];
        if (!array) {
            return null;
        }

        return _.find(array, "message", message);
    }

    private computeHash(message: Object): number {
        if (!message)
            return 0;

        var hash = _.sum(_.map(_.pairs(message), this.computeMemberHash, this));
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