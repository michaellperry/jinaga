import { LoginResponse, QueryMessage, QueryResponse } from './messages';

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
            const request = new XMLHttpRequest();
            request.open('GET', this.url + path, true);
            request.onload = () => {
                const response = <{}>JSON.parse(request.response);
                resolve(response);
            };
            request.onerror = (event) => {
                reject(event.error.message);
            };
            request.send();
        });
    }

    private async post(path: string, body: {}) {
        return new Promise<{}>((resolve, reject) => {
            const request = new XMLHttpRequest();
            request.open('POST', this.url + path, true);
            request.onload = () => {
                const response = <{}>JSON.parse(request.response);
                resolve(response);
            };
            request.onerror = (event) => {
                reject(event.error.message);
            };
            request.send(JSON.stringify(body));
        });
    }
}