/**
 * This class contains a list of utilities.
 */
class Utilities {
    /**
     * Helper function to delay execution. Should not be used in UI tests. Use built-in wait methods instead.
     *
     * @param time - Time in milliseconds to delay execution.
     * @returns A Promise that resolves after the time has passed.
     */
    async delay(time: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

    /**
     * Gets the value of a required environment variable.
     *
     * @param name - Name of the environment variable to retrieve.
     * @returns The nonempty environment variable value.
     * @throws Error when the environment variable is undefined, empty, or contains only whitespace.
     */
    requireEnv(name: string): string {
        const value = process.env[name];
        if (value === undefined || value?.trim() === '') {
            throw new Error(`[ConfigError] Environment variable ${name} is not set or is empty.`);
        }
        return value;
    }
}

export const utilities = new Utilities();
