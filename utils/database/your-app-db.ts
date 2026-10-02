import { awsSecretsManager } from '../aws';
import { databaseFactory, OracleDatabase } from '../database';
import { utilities as automationUtilities } from '../utilities/utilities';

interface ConnectionString {
    user: string;
    password: string;
    connectionString: string;
}

interface PasswordSecret {
    password: string;
}

class YourAppDb {
    private readonly oracle: OracleDatabase;

    constructor() {
        const database = databaseFactory.getDBInstance('oracle');
        if (!(database instanceof OracleDatabase)) {
            throw new Error('The database factory did not return an Oracle database instance.');
        }
        this.oracle = database;
    }

    /**
     * Database method to get the data connection string for the given database name and database credentials
     * @param dbName - the database name to be executed
     * @param userName - the database user name to be executed
     * @param passwordName - the database password to be executed
     * @returns - the method returns the database connString for a given database
     */
    async getConnectionString(dbName: string, userName: string, passwordName: string): Promise<ConnectionString> {
        const password = await awsSecretsManager.getSecretFromAws(automationUtilities.requireEnv('SECRET_ROLE_ARN'), passwordName);
        const passwordSecret: PasswordSecret = JSON.parse(password);

        return {
            user: userName,
            password: passwordSecret.password,
            connectionString: dbName,
        };
    }

    /**
     * Database method to get the data for the given query, execute the query then close the database connection and return the result as a JSON object.
     * @param query - the query to be executed (with no ; on the end)
     * @param connString -connString optional parameter,get values from the env props as default
     * @param bindParams - bindParams for the query as an optional parameter
     * @returns - the method returns the executed query result as a JSON object
     */
    async runQuery<TRow = Record<string, unknown>>(query: string, connString: ConnectionString | null = null, bindParams: unknown[] = []): Promise<TRow[]> {
        if (!connString) {
            connString = await this.getConnectionString(
                automationUtilities.requireEnv('DB_NAME'),
                automationUtilities.requireEnv('DB_USER'),
                automationUtilities.requireEnv('DB_PASSWORD_NAME'),
            );
        }
        const connObj = await this.oracle.openConnection(connString);
        try {
            const res = await this.oracle.executeQuery(connObj, query, bindParams);
            return (res.rows ?? []) as TRow[];
        } finally {
            await this.oracle.closeConnection(connObj);
        }
    }
}

export const yourAppDb = new YourAppDb();
