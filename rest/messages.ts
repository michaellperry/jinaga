export class FactMessage {

}

export class ProfileMessage {
    displayName: string;
}

export type LoginResponse = {
    userFact: FactMessage,
    profile: ProfileMessage
}
