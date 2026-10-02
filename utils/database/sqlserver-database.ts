import mssql, { type config, type ConnectionPool } from 'mssql';
import { customLogger } from '../utilities/winston-logger';
import { Database } from './database';

export class SQLServerDatabase extends Database {
    /**
     * Opens a connection to the SQL Server database using the supplied connection details.
     *
     * @param connString - The connection string or config object used to connect.
     * @returns The active SQL Server connection pool.
     * @throws Error if the connection cannot be established.
     */
    async openConnection(connString: string | config): Promise<ConnectionPool> {
        try {
            return await mssql.connect(connString);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to connect to SQL Server database, ${message}`);
        }
    }

    /**
     * Executes a SQL query on the provided connection pool.
     *
     * @param connObj - The SQL Server connection pool.
     * @param query - The SQL query to execute.
     * @returns The result of the executed query.
     * @throws Error if the query cannot be executed.
     */
    async executeQuery(connObj: ConnectionPool, query: string): Promise<mssql.IResult<any>> {
        try {
            return await connObj.request().query(query);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to execute query, ${message}`);
        }
    }

    /**
     * Closes the supplied SQL Server connection pool.
     *
     * @param connObj - The active connection pool to close.
     */
    async closeConnection(connObj: ConnectionPool): Promise<void> {
        try {
            await connObj.close();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            customLogger.error(`Failed to close connection, ${message}`);
        }
    }
}
