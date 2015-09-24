import Interface = require("./interface");
import StorageProvider = Interface.StorageProvider;
import Coordinator = Interface.Coordinator;
import Query = Interface.Query;

class MongoProvider implements Interface.StorageProvider {
    private coordinator: Coordinator;

    init(coordinator:Coordinator) {
        this.coordinator = coordinator;
    }

    sendAllFacts() {
    }

    push(fact:Object) {
    }

    save(fact:Object, source:any) {
        setTimeout(() => {
           this.coordinator.onSaved(fact, source);
        }, 100);
    }

    executeQuery(
        start:Object,
        query:Query,
        result:(error: string, facts: Array<Object>) => void,
        thisArg:Object) {

        setTimeout(() => {
            result(null, []);
        }, 100);
    }
}

export = MongoProvider;
