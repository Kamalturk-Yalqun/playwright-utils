import oracledb, { type Connection, type ConnectionAttributes, type Result } from 'oracledb';
import { customLogger } from '../utilities/winston-logger';
import { Database } from './database';

/**
 * Oracle database implementation for opening connections, executing queries, and closing connections.
 */
export class OracleDatabase extends Database {
    /**
     * Opens a connection to the Oracle database using the provided connection attributes.
     *
     * @param connectionOptions - Oracle connection attributes or an Easy Connect syntax connection string.
     * @returns The active Oracle connection.
     * @throws Error if the connection cannot be established.
     */
    async openConnection(connectionOptions: string | ConnectionAttributes): Promise<Connection> {
        try {
            const attributes = typeof connectionOptions === 'string' ? { connectionString: connectionOptions } : connectionOptions;
            return await oracledb.getConnection(attributes);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to connect to the Oracle database: ${message}`);
        }
    }

    /**
     * Executes a SQL query on the provided database connection.
     *
     * @param connObj - The active Oracle database connection.
     * @param query - The SQL query to execute, without a trailing semicolon.
     * @param bindParams - Bind parameters for the query.
     * @returns The query results object.
     * @throws Error if the query cannot be executed.
     */
    async executeQuery(connObj: Connection, query: string, bindParams: unknown[] = []): Promise<Result<unknown>> {
        try {
            return await connObj.execute(query, bindParams, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to execute query: ${message}`);
        }
    }

    /**
     * Closes the provided database connection.
     *
     * @param connObj - The active Oracle database connection.
     */
    async closeConnection(connObj: Connection): Promise<void> {
        try {
            await connObj.close();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            customLogger.error(`Failed to close connection, ${message}`);
        }
    }
}
