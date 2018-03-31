import { LoginResponse } from './messages';

export class WebClient {
    constructor(private url: string) {
    }

    async login(): Promise<LoginResponse> {
        return <LoginResponse>await this.get('/login');
    }

    private async get(path: string): Promise<{}> {
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
}