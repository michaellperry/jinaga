import { JinagaBrowser, FactRecord } from "../../src/jinaga-browser";
import { expect } from "chai";

describe("Visualization", () => {
    it("accepts callback", () => {
        const j = JinagaBrowser.create({});
        const stop = j.onFactAdded(factRecord => {});
        stop();
    });

    it("notifies on new fact", async () => {
        const j = JinagaBrowser.create({});
        const facts: FactRecord[] = [];
        const stop = j.onFactAdded(factRecord => {
            facts.push(factRecord);
        });
        const fact = await j.fact({
            type: "Test",
            identifier: "testfact"
        });
        stop();

        expect(facts).to.deep.equal([
            {
                type: "Test",
                hash: j.hash(fact),
                fields: {
                    identifier: "testfact"
                },
                predecessors: {}
            }
        ]);
    });

    it("does not notify on duplicate facts", async () => {
        const j = JinagaBrowser.create({});
        const facts: FactRecord[] = [];
        const stop = j.onFactAdded(factRecord => {
            facts.push(factRecord);
        });
        const fact = await j.fact({
            type: "Test",
            identifier: "testfact"
        });
        await j.fact({
            type: "Test",
            identifier: "testfact"
        });
        stop();

        expect(facts).to.deep.equal([
            {
                type: "Test",
                hash: j.hash(fact),
                fields: {
                    identifier: "testfact"
                },
                predecessors: {}
            }
        ]);
    });

    it("stops notifying", async () => {
        const j = JinagaBrowser.create({});
        const facts: FactRecord[] = [];
        const stop = j.onFactAdded(factRecord => {
            facts.push(factRecord);
        });
        const fact = await j.fact({
            type: "Test",
            identifier: "testfact"
        });
        stop();
        await j.fact({
            type: "Test",
            identifier: "secondfact"
        });

        expect(facts).to.deep.equal([
            {
                type: "Test",
                hash: j.hash(fact),
                fields: {
                    identifier: "testfact"
                },
                predecessors: {}
            }
        ]);
    });

    it("can load fact by hash", async () => {
        const j = JinagaBrowser.create({});
        const fact = await j.fact({
            type: "Test",
            identifier: "testfact"
        });
        const loaded = await j.load("Test", j.hash(fact));
        expect(loaded).to.deep.equal(fact);
    });

    it("returns null if fact is not found", async () => {
        const j = JinagaBrowser.create({});
        const loaded = await j.load("Test", "notthere");
        expect(loaded).to.be.null;
    });
});