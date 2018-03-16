import { Inverse } from '../query/inverter';
import { Query } from '../query/query';
import { _isEqual } from '../utility/collections';
import { computeHash } from '../utility/fact';

export class Watch {
    private mappings: { [hash: number]: Array<{ fact: Object, mapping: any }>; } = {};
    private children: Array<Watch> = [];

    constructor(
        public start: Object,
        public joins: Query,
        public resultAdded: (mapping: any, fact: Object) => any,
        public resultRemoved: (mapping: any) => void,
        public inverses: Array<Inverse>,
        public outer: Watch,
        public backtrack: Query
    ) {
    }

    public push(fact: Object, mapping: any) {
        if (!mapping)
            return;
        var hash = computeHash(fact);
        var array = this.mappings[hash];
        if (!array) {
            array = [];
            this.mappings[hash] = array;
        }
        array.push({ fact, mapping });
    }

    public get(fact: Object): any {
        return this.lookup(fact, false);
    }

    public pop(fact: Object): any {
        return this.lookup(fact, true);
    }

    public addChild(child: Watch) {
        this.children.push(child);
    }

    public removeChild(child: Watch) {
        var index = this.children.indexOf(child);
        if (index >= 0) {
            this.children.splice(index, 1);
        }
    }

    public depthFirst(action: (watch: Watch) => void) {
        action(this);
        this.children.forEach((watch) => {
            watch.depthFirst(action);
        });
    }

    public countWatches(): number {
        return this.children.reduce((i, w) => {
            return i + w.countWatches();
        }, 1);
    }

    private lookup(fact: Object, remove: boolean): any {
        var hash = computeHash(fact);
        var array = this.mappings[hash];
        if (!array)
            return null;
        for(var index = 0; index < array.length; index++) {
            if (_isEqual(array[index].fact, fact)) {
                var mapping = array[index].mapping;
                if (remove)
                    array.splice(index, 1);
                return mapping;
            }
        }
        return null;
    }
}