import { LoadMessage, LoadResponse, LoginResponse, QueryMessage, QueryResponse, SaveMessage, SaveResponse } from './messages';

export type SyncStatus = {
    sending: boolean;
    retrying: boolean;
    retryInSeconds: number;
    warning: string;
}

export class SyncStatusNotifier {
    private syncStatusHandlers: ((status: SyncStatus) => void)[] = [];

    onSyncStatus(handler: (status: SyncStatus) => void) {
        this.syncStatusHandlers.push(handler);
    }

    notify(status: SyncStatus) {
        this.syncStatusHandlers.forEach(handler => {
            handler(status);
        });
    }
}

export interface HttpSuccess {
    result: "success";
    response: {}
}

export interface HttpFailure {
    result: "failure";
    error: string;
}

export interface HttpRetry {
    result: "retry";
    error: string
}

export type HttpResponse = HttpSuccess | HttpFailure | HttpRetry;

export interface HttpConnection {
    get(path: string): Promise<{}>;
    post(path: string, body: {}, timeoutSeconds: number): Promise<HttpResponse>;
}

function delay(timeSeconds: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        setTimeout(resolve, timeSeconds * 1000);
    });
}

export class WebClient {
    constructor(
        private httpConnection: HttpConnection,
        private syncStatusNotifier: SyncStatusNotifier) {
    }

    async login() {
        return <LoginResponse> await this.httpConnection.get('/login');
    }

    async query(query: QueryMessage) {
        return <QueryResponse> await this.post('/query', query);
    }

    async save(save: SaveMessage) {
        return <SaveResponse> await this.postWithRetry('/save', save);
    }

    async load(load: LoadMessage) {
        return <LoadResponse> await this.post('/load', load);
    }

    private async post(path: string, body: {}) {
        const response = await this.httpConnection.post(path, body, 1);
        if (response.result === 'success') {
            return response.response;
        }
        else {
            throw new Error(response.error);
        }
    }

    private async postWithRetry(path: string, body: {}) {
        let timeoutSeconds = 5;
        let retrySeconds = 1;

        while (true) {
            this.syncStatusNotifier.notify({
                sending: true,
                retrying: false,
                retryInSeconds: 0,
                warning: ''
            });
            const response = await this.httpConnection.post(path, body, timeoutSeconds);
            if (response.result === "success") {
                this.syncStatusNotifier.notify({
                    sending: false,
                    retrying: false,
                    retryInSeconds: 0,
                    warning: ''
                });
                return response.response;
            }
            else if (response.result === "failure") {
                this.syncStatusNotifier.notify({
                    sending: false,
                    retrying: false,
                    retryInSeconds: 0,
                    warning: response.error
                });
                throw new Error(response.error);
            }
            else {
                this.syncStatusNotifier.notify({
                    sending: false,
                    retrying: true,
                    retryInSeconds: retrySeconds,
                    warning: response.error
                });
                await delay(retrySeconds);
                timeoutSeconds = Math.min(timeoutSeconds * 2, 60);
                retrySeconds = Math.min(retrySeconds * 2, 60);
            }
        }
    }
}