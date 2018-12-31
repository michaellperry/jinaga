import {
    LoadMessage,
    LoadResponse,
    LoginResponse,
    QueryMessage,
    QueryResponse,
    SaveMessage,
    SaveResponse,
} from './messages';

function createXHR(
    method: string,
    path: string,
    resolve: (result: any) => void,
    reject: (reason: any) => void,
    retry: (reason: any) => void
) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, path, true);
    xhr.onload = () => {
        if (xhr.status === 403) {
            reject(xhr.responseText);
        }
        else if (xhr.status >= 400) {
            retry(xhr.responseText);
        }
        else if (xhr.responseType === 'json') {
            const response = <{}>xhr.response;
            resolve(response);
        }
        else {
            const response = <{}>JSON.parse(xhr.response);
            resolve(response);
        }
    };
    xhr.ontimeout = (event) => {
        retry('Network request timed out.');
    };
    xhr.onerror = (event) => {
        retry('Network request failed.');
    };
    xhr.setRequestHeader('Accept', 'application/json');
    return xhr;
}

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

export class WebClient {
    constructor(
        private url: string,
        private syncStatusNotifier: SyncStatusNotifier) {
    }

    async login() {
        return <LoginResponse> await this.get('/login');
    }

    async query(query: QueryMessage) {
        return <QueryResponse> await this.post('/query', query);
    }

    async save(save: SaveMessage) {
        return <SaveResponse> await this.post('/save', save);
    }

    async load(load: LoadMessage) {
        return <LoadResponse> await this.post('/load', load);
    }

    private async get(path: string) {
        return new Promise<{}>((resolve, reject) => {
            const xhr = createXHR('GET', this.url + path, resolve, reject, reject);
            xhr.send();
        });
    }

    private async post(path: string, body: {}) {
        return new Promise<{}>((resolve, reject) => {
            let timeoutSeconds = 5;
            let retrySeconds = 1;
            const send = () => {
                this.syncStatusNotifier.notify({
                    sending: true,
                    retrying: false,
                    retryInSeconds: 0,
                    warning: ''
                });
                const xhr = createXHR('POST', this.url + path,
                    (result: any) => {
                        this.syncStatusNotifier.notify({
                            sending: false,
                            retrying: false,
                            retryInSeconds: 0,
                            warning: ''
                        });
                        resolve(result);
                    },
                    (result: any) => {
                        this.syncStatusNotifier.notify({
                            sending: false,
                            retrying: false,
                            retryInSeconds: 0,
                            warning: result
                        });
                        reject(result);
                    },
                    retry);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.timeout = timeoutSeconds * 1000;
                xhr.send(JSON.stringify(body));
            };
            const retry = (reason: any) => {
                this.syncStatusNotifier.notify({
                    sending: false,
                    retrying: true,
                    retryInSeconds: retrySeconds,
                    warning: reason
                });
                setTimeout(() => {
                    timeoutSeconds = Math.min(timeoutSeconds * 2, 60);
                    retrySeconds = Math.min(retrySeconds * 2, 60);
                    send();
                }, retrySeconds * 1000);
            };
            send();
        });
    }
}