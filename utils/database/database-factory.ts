import { OracleDatabase } from './oracle-database';
import { PostgresDatabase } from './postgres-database';
import { SQLServerDatabase } from './sqlserver-database';

/**
 * Factory for creating database implementations by type.
 */
class DatabaseFactory {
    /**
     * Returns the matching database implementation instance for the supplied type.
     *
     * @param dbType - The database type: oracle, sql, or postgres.
     * @returns The matching database implementation instance.
     */
    getDBInstance(dbType: string): OracleDatabase | SQLServerDatabase | PostgresDatabase {
        switch (dbType.toLowerCase()) {
            case 'oracle':
                return new OracleDatabase();
            case 'sql':
                return new SQLServerDatabase();
            case 'postgres':
                return new PostgresDatabase();
            default:
                throw new Error(`${dbType} is not supported`);
        }
    }
}
export const databaseFactory = new DatabaseFactory();
