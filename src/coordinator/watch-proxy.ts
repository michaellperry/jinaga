import { Proxy } from '../query/parser';
import { JinagaCoordinator } from './jinaga-coordinator';
import { Watch } from './watch';

export class WatchProxy {
    constructor(
        private _coordinator: JinagaCoordinator,
        private _watch: Watch
    ) { }

    public watch(
        templates: Array<(target: Proxy) => Object>,
        resultAdded: (result: Object) => void,
        resultRemoved: (result: Object) => void) : WatchProxy {
        var nextWatch = this._coordinator.watch(
            this._watch.start,
            this._watch,
            templates,
            resultAdded,
            resultRemoved);
        return new WatchProxy(this._coordinator, nextWatch);
    }

    public stop() {
        if (this._watch) {
            this._coordinator.removeWatch(this._watch);
        }
    }
}