class ServiceInstance {
    private promise: Promise<void> = null;

    constructor(
        private service: () => Promise<void>
    ) { }

    public start() {
        return this.service();
    }

    public setPromise(promise: Promise<void>) {
        this.promise = promise;
    }

    public result() {
        return this.promise;
    }

    public fail(exception: any) {
        console.error(exception);
    }
}

class ServiceRunner {
    private services: ServiceInstance[] = [];

    run(service: () => Promise<void>) {
        const instance = new ServiceInstance(service);
        this.services.push(instance);
        try {
            const promise = instance.start()
                .then(() => {
                    this.succeed(instance);
                })
                .catch(x => {
                    this.fail(instance, x);
                });
            instance.setPromise(promise);
        }
        catch (x) {
            this.fail(instance, x);
        }
    }

    all() {
        return Promise.all(this.services.map(s => s.result()));
    }

    private succeed(instance: ServiceInstance) {
        this.remove(instance);
    }

    private fail(instance: ServiceInstance, exception: any) {
        instance.fail(exception);
        this.remove(instance);
    }

    private remove(instance: ServiceInstance) {
        const index = this.services.indexOf(instance);
        if (index >= 0)
            this.services.splice(index, 1);
    }
}

describe('ServiceRunner', () => {
    it('should terminate when no services running', async () => {
        const serviceRunner = new ServiceRunner();
        await serviceRunner.all();
    });
});