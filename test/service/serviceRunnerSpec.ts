import { expect } from "chai";
import { ServiceRunner } from "../../src/util/serviceRunner";

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