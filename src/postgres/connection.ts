import { Pool, PoolClient } from 'pg';

export type Row = { [key: string]: any };

export class ConnectionFactory {
    private postgresPool: Pool;

    constructor (postgresUri: string) {
        this.postgresPool = new Pool({
            connectionString: postgresUri
        });
    }

    withTransaction<T>(callback: (connection: PoolClient) => Promise<T>) {
        return this.with(async connection => {
            try {
                await connection.query('BEGIN');
                const result = await callback(connection);
                await connection.query('COMMIT');
                return result;
            }
            catch (e) {
                await connection.query('ROLLBACK');
                throw e;
            }
        })
    }

    async with<T>(callback: (connection: PoolClient) => Promise<T>) {
        const client = await this.createClient();
        try {
            return await callback(client);
        }
        finally {
            client.release();
        }
    }

    private async createClient() {
        return await this.postgresPool.connect();
    }
}