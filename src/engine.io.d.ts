declare class Engine {
    static listen(port: number);
    on(event: string, handler);
}

export = Engine;
