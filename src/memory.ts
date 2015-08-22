/// <reference path="jinaga.ts" />

import Interface = require("./interface");
import StorageProvider = Interface.StorageProvider;
import Join = Interface.Join;
import Direction = Interface.Direction;
import _ = require("lodash");

class Node {
    successors: { [role: string]: Array<Node> } = {};

    constructor(
        public message: Object) {
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
        var array = this.successors[role];
        if (!array)
            array = [];
        return array;
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
        joins: Array<Join>,
        result: (error: string, messages: Array<Object>) => void) {

        var startingNode = this.findNode(start);
        if (!startingNode) {
            result(null, []);
            return;
        }

        var nodes: Array<Node> = [startingNode];
        for (var joinIndex in joins) {
            if (nodes.length == 0)
                break;

            var nextNodes: Array<Node> = [];
            var join = joins[joinIndex];
            for (var nodeIndex in nodes) {
                var node = nodes[nodeIndex];

                if (join.direction === Direction.Successor) {
                    nextNodes = nextNodes.concat(node.successorsIn(join.role));
                }
            }
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
            node = new Node(message);
            array.push(node);

            for (var field in message) {
                var value = message[field];
                if (typeof(value) === "object") {
                    var predecessor = this.insertNode(value);
                    if (predecessor)
                        predecessor.addSuccessor(field, node);
                }
            }
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