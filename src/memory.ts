/// <reference path="jinaga.ts" />

import Interface = require("interface");
import StorageProvider = Interface.StorageProvider;
import Join = Interface.Join;
import _ = require("lodash");

class MemoryProvider implements StorageProvider {
    messages: Array<Object> = [];

    save(
        message: Object,
        result: (error: string) => void) {

        this.messages.push(message);
        result(null);
    }

    executeQuery(
        start: Object,
        joins: Array<Join>,
        result: (error: string, messages: Array<Object>) => void) {

        var matching = _.filter(this.messages, this.matchesQuery(joins));

        result(null, matching);
    }

    private matchesQuery(joins: Array<Join>): (message: Object) => boolean {
        return (message: Object) => true;
    }
}

export = MemoryProvider;