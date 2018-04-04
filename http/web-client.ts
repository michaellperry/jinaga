import { LoginResponse, QueryMessage, QueryResponse } from './messages';

function createXHR(method: string, path: string, resolve: (result: any) => void, reject: (reason: any) => void) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, path, true);
    xhr.onload = () => {
        if (xhr.responseType === 'json') {
            const response = <{}>JSON.parse(xhr.response);
            resolve(response);
        }
        else {
            reject(xhr.responseText);
        }
    };
    xhr.onerror = (event) => {
        reject(event.error.message);
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