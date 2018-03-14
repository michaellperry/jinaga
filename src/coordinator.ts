export interface Coordinator {
    onSaved(fact: Object, source: any);
    send(fact: Object, source: any);
    onReceived(fact: Object, userFact: Object, source: any);
    onDelivered(token: number, destination: any);
    onDone(token: number);
    onProgress(queueCount: number);
    onError(err: string);
    onLoggedIn(userFact: Object, profile: Object);
    resendMessages();
}
