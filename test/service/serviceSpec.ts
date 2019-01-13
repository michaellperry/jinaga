import { expect } from "chai";

class ServiceInstance {
    promise: Promise<void> = null;
}

class ServiceRunner {
    private services: ServiceInstance[] = [];

    constructor(
        private error: (exception: any) => void = _ => { }
    ) { }

    run(service: () => Promise<void>) {
        const instance = new ServiceInstance();
        this.services.push(instance);
        try {
            const promise = service()
                .then(() => {
                    this.succeed(instance);
                })
                .catch(x => {
                    this.fail(instance, x);
                });
            instance.promise = promise;
        }
        catch (x) {
            this.fail(instance, x);
        }
    }

    all() {
        return Promise.all(this.services.filter(s => s.promise).map(s => s.promise));
    }

    private succeed(instance: ServiceInstance) {
        this.remove(instance);
    }

    private fail(instance: ServiceInstance, exception: any) {
        this.error(exception);
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

    it('should terminate after successful synchronous operation', async () => {
        const serviceRunner = new ServiceRunner();
        serviceRunner.run(async () => { });
        await serviceRunner.all();
    });

    it('should terminate after successful asynchronous operation', async () => {
        const serviceRunner = new ServiceRunner();
        serviceRunner.run(async () => { await Promise.resolve(); });
        await serviceRunner.all();
    });

    it('should report a synchronous exception', async () => {
        let messages: string[] = [];
        function error(exception: any) {
            messages.push(exception.message);
        }
        const serviceRunner = new ServiceRunner(error);
        serviceRunner.run(() => { throw new Error('Message'); return Promise.resolve(); });
        expect(messages).to.deep.equal([
            'Message'
        ]);
        await serviceRunner.all();
        expect(messages).to.deep.equal([
            'Message'
        ]);
    });

    it('should report an asynchronous exception', async () => {
        let messages: string[] = [];
        function error(exception: any) {
            messages.push(exception.message);
        }
        const serviceRunner = new ServiceRunner(error);
        serviceRunner.run(async () => { await Promise.resolve(); throw new Error('Message'); });
        expect(messages).to.deep.equal([
        ]);
        await serviceRunner.all();
        expect(messages).to.deep.equal([
            'Message'
        ]);
    });
});