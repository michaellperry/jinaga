/// <reference path="jinaga.ts" />

import Interface = require("interface");
import StorageProvider = Interface.StorageProvider;
import Join = Interface.Join;

class MemoryProvider implements StorageProvider {
    save(
        message: Object,
        result: (error: string) => void) {

    }

    executeQuery(
        start: Object,
        joins: Array<Join>,
        result: (error: string, messages: Array<Object>) => void) {

        result("Not implemented", []);
    }
}

export = MemoryProvider;