declare class Engine {
    static listen(port: number);
    static attach(http);
    on(event: string, handler);
}

export = Engine;
