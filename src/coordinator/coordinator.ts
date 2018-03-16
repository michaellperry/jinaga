export interface Coordinator {
    onSaved(fact: Object, source: any): void;
    send(fact: Object, source: any): void;
    onReceived(fact: Object, userFact: Object, source: any): void;
    onDelivered(token: number, destination: any): void;
    onDone(token: number): void;
    onProgress(queueCount: number): void;
    onError(err: string): void;
    onLoggedIn(userFact: Object, profile: Object): void;
    resendMessages(): void;
}
