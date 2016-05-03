class Pool<Connection> {
    private connection: Connection = null;
    private actions: Array<(connection: Connection, done: () => void) => void> = [];
    private running: number = 0;

    constructor(
        private createConnection: (done: (connection: Connection) => void) => void,
        private closeConnection: (connection: Connection) => void
    ) { }

    begin(action: (connection: Connection, done: () => void) => void) {
        if (this.connection) {
            this.callAction(action);
        }
        else {
            if (this.actions.length === 0) {
                this.createConnection((connection: Connection) => {
                    if (connection) {
                        this.connection = connection;
                        this.actions.forEach((readyAction: (connection: Connection, done: () => void) => void) => {
                            this.callAction(readyAction);
                        });
                    }
                    this.actions = [];
                });
            }
            this.actions.push(action);
        }
    }

    private callAction(action: (connection: Connection, done: () => void) => void) {
        this.running++;
        action(this.connection, () => {
            this.running--;
            if (this.running === 0) {
                var connection = this.connection;
                this.connection = null;
                this.closeConnection(connection);
            }
        });
    }
}

export default Pool;
