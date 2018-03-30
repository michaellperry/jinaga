export class FactMessage {

}

export class ProfileMessage {
    displayName: string;
}

export type LoginResponse = {
    userFact: FactMessage,
    profile: ProfileMessage
}

export class WebClient {
    constructor(private url: string) {
    }

    async login(): Promise<LoginResponse> {
        return new Promise<LoginResponse>((resolve, reject) => {
            const request = new XMLHttpRequest();
            request.open('GET', this.url + '/login', true);
            request.onload = () => {
                const response = <LoginResponse>JSON.parse(request.response);
                resolve(response);
            };
            request.onerror = (event) => {
                reject(event.error.message);
            };
            request.send();
        });
    }
}