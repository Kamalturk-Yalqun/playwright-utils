import { readFileSync } from 'node:fs';
import type { Client, ClientConfig } from 'pg';
import { awsSecretsManager as aws } from '../aws';
import { databaseFactory as dbFactory, PostgresDatabase } from '../database';

/** PostgreSQL connection values loaded from environment variables and AWS. */
export interface PostgresConnectionEnvironment {
    host?: string;
    port?: string;
    database?: string;
    user?: string;
    password: string;
    schema?: string;
}

/**
 * Provides helper operations for PostgreSQL databases, including building a
 * connection configuration, running a query, and running a query read from a
 * file.
 */
class PostgresDatabaseHelper {
    /** PostgreSQL database implementation used to manage connections and queries. */
    postgres: PostgresDatabase;

    /** Creates a helper backed by the PostgreSQL implementation from the database factory. */
    constructor() {
        this.postgres = dbFactory.getDBInstance('postgres') as PostgresDatabase;
    }

    /**
     * Builds a PostgreSQL connection configuration from environment variables.
     * The database password is retrieved from AWS Secrets Manager using
     * `SECRET_ROLE_ARN` and `DB_PASSWORD_NAME`.
     *
     * @returns The connection configuration for the target PostgreSQL database,
     * including the optional schema when `DB_SCHEMA` is configured.
     */
    async getConnectionString(): Promise<PostgresConnectionEnvironment> {
        const password = await aws.getSecretFromAws(process.env.SECRET_ROLE_ARN!, process.env.DB_PASSWORD_NAME!);
        const connection: PostgresConnectionEnvironment = {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password,
        };

        if (process.env.DB_SCHEMA) {
            connection.schema = process.env.DB_SCHEMA;
        }
        return connection;
    }

    /**
     * Opens a PostgreSQL connection, executes a query, closes the connection,
     * and returns the resulting rows.
     *
     * @param query - SQL query to execute without a trailing semicolon.
     * @param bindParams - Optional bind parameters for the query. Defaults to an
     * empty array.
     * @returns The rows returned by the executed query.
     */
    async runQuery<T = Record<string, unknown>>(query: string, bindParams: unknown[] = []): Promise<T[]> {
        const connectionConfig = await this.getConnectionString();
        const connObj: Client = await this.postgres.openConnection(connectionConfig as unknown as ClientConfig);
        try {
            const result = await this.postgres.executeQuery(connObj, query, bindParams);
            return result.rows as T[];
        } finally {
            await this.postgres.closeConnection(connObj);
        }
    }

    /**
     * Reads a SQL query from a file and executes it through `runQuery()`.
     *
     * @param filePath - Path to the file containing the SQL query.
     * @param bindParams - Optional bind parameters for the query. Defaults to an
     * empty array.
     * @returns The rows returned by the executed query.
     */
    async runQueryFromFile<T = Record<string, unknown>>(filePath: string, bindParams: unknown[] = []): Promise<T[]> {
        const query = readFileSync(filePath).toString();
        return this.runQuery<T>(query, bindParams);
    }
}

export { PostgresDatabaseHelper };
export const postgresDatabaseHelper = new PostgresDatabaseHelper();
