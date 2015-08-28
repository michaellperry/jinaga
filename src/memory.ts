/// <reference path="jinaga.ts" />

import Interface = require("./interface");
import StorageProvider = Interface.StorageProvider;
import Query = Interface.Query;
import SelfQuery = Interface.SelfQuery;
import JoinQuery = Interface.JoinQuery;
import Direction = Interface.Direction;
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

    save(
        message: Object,
        result: (error: string) => void) {

        this.insertNode(message);
        result(null);
    }

    executeQuery(
        start: Object,
        query: Query,
        result: (error: string, messages: Array<Object>) => void) {

        var startingNode = this.findNode(start);
        if (!startingNode) {
            result(null, []);
            return;
        }

        var nodes: Array<Node> = [startingNode];
        while (query instanceof JoinQuery && nodes.length > 0) {
            var joinQuery = <JoinQuery>query;
            var nextNodes: Array<Node> = [];
            var join = joinQuery.join;
            for (var nodeIndex in nodes) {
                var node = nodes[nodeIndex];

                nextNodes = nextNodes.concat(
                    join.direction === Direction.Successor
                        ? node.successorsIn(join.role)
                        : node.predecessorsInRole(join.role));
            }
            query = joinQuery.tail;
            nodes = nextNodes;
        }

        result(null, _.pluck(nodes, "message"));
    }

    private insertNode(message: Object): Node {
        var hash = this.computeHash(message);
        var array = this.nodes[hash];
        if (!array) {
            array = [];
            this.nodes[hash] = array;
        }
        var node = _.find(array, "message", message);
        if (!node) {
            var predecessors = {};
            for (var field in message) {
                var value = message[field];
                if (typeof(value) === "object") {
                    var predecessor = this.insertNode(value);
                    predecessors[field] = [ predecessor ];
                }
            }

            node = new Node(message, predecessors);
            for (var role in predecessors) {
                var predecessorArray = <Array<Node>>predecessors[role];
                predecessorArray[0].addSuccessor(role, node);
            }
            array.push(node);
        }
        return node;
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