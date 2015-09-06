export declare class Socket {
    constructor(endpoint: string);
    send(message);
    on(event: string, handler);
}
