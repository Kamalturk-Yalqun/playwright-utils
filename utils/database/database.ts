/**
 * Abstract base class for database implementations.
 *
 * Child classes must implement the following methods:
 * - `openConnection(connectionString)` to open and return a connection
 * - `executeQuery(connection, query)` to run a database query
 * - `closeConnection(connection)` to close the active connection
 */
export abstract class Database<TConnection = unknown, TResult = unknown> {
    abstract openConnection(connectionString: string): Promise<TConnection> | TConnection;
    abstract executeQuery(connection: TConnection, query: string): Promise<TResult> | TResult;
    abstract closeConnection(connection: TConnection): Promise<void> | void;

    constructor() {
        // Throw an error if an attempt is made to create an instance of the abstract class
        if (this.constructor === Database) {
            throw new Error('Abstract class "Database" cannot be instantiated directly');
        }

        // Throw an error if an attempt is made to create an instance of a child class that has not implemented the abstract functions
        if (this.openConnection === undefined) {
            throw new Error('Child classes must implement an "openConnection" method that takes a connection string and returns the connection object');
        }

        if (this.executeQuery === undefined) {
            throw new Error('Child classes must implement an "executeQuery" method that takes a connection object and query and returns the result object');
        }

        if (this.closeConnection === undefined) {
            throw new Error('Child classes must implement a "closeConnection" method that takes a connection object');
        }
    }
}
