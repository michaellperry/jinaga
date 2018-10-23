import {
    LoadMessage,
    LoadResponse,
    LoginResponse,
    QueryMessage,
    QueryResponse,
    SaveMessage,
    SaveResponse,
} from './messages';

function createXHR(method: string, path: string, resolve: (result: any) => void, reject: (reason: any) => void) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, path, true);
    xhr.onload = () => {
        if (xhr.status >= 400) {
            reject(xhr.responseText);
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
    xhr.onerror = (event) => {
        reject('Network request failed.');
    };
    xhr.setRequestHeader('Accept', 'application/json');
    return xhr;
}

export class WebClient {
    constructor(private url: string) {
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
            const xhr = createXHR('GET', this.url + path, resolve, reject);
            xhr.send();
        });
    }

    private async post(path: string, body: {}) {
        return new Promise<{}>((resolve, reject) => {
            const xhr = createXHR('POST', this.url + path, resolve, reject);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(body));
        });
    }
}