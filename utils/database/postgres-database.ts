import { Client, type ClientConfig, type QueryResult } from 'pg';
import { customLogger } from '../utilities/winston-logger';
import { Database } from './database';

/**
 * PostgreSQL database implementation for opening connections, executing queries, and closing connections.
 */
export class PostgresDatabase extends Database {
    /**
     * Opens a connection to the PostgreSQL database using the provided connection configuration.
     *
     * @param connString - The connection string or config object used to connect to PostgreSQL.
     * @returns The connected PostgreSQL client.
     * @throws Error if the connection cannot be established.
     */
    async openConnection(connString: string | ClientConfig): Promise<Client> {
        try {
            const client = new Client(connString);
            await client.connect();
            return client;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to connect to the PostgreSQL database: ${message}`);
        }
    }

    /**
     * Executes a query with the provided client object.
     *
     * @param clientObj - The PostgreSQL client used to execute the query.
     * @param query - The SQL query to execute.
     * @param bindParams - Optional bind parameters for the query.
     * @returns The result object returned by PostgreSQL.
     * @throws Error if the query execution fails.
     */
    async executeQuery(clientObj: Client, query: string, bindParams: unknown[] = []): Promise<QueryResult> {
        try {
            return await clientObj.query(query, bindParams);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to execute query: ${message}`);
        }
    }

    /**
     * Closes the connection to the PostgreSQL database.
     *
     * @param clientObj - The PostgreSQL client connection to close.
     */
    async closeConnection(clientObj: Client): Promise<void> {
        try {
            await clientObj.end();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            customLogger.error(`Failed to close connection, ${message}`);
        }
    }
}
