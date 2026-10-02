import { awsSecretsManager as aws } from '../aws';

/** Configuration properties associated with a user. */
interface UserData {
    /** Optional AWS secret name used to retrieve the user's password. */
    passwordName?: string;
    [property: string]: unknown;
}

/** User configuration indexed by username. */
export type UsersData = Record<string, UserData>;

/**
 * Provides access to configured user properties and retrieves user passwords
 * from AWS Secrets Manager.
 */
export class Users {
    /** Configured user data indexed by username. */
    readonly userObjects: UsersData;

    /**
     * Creates a user utility from the supplied user configuration.
     *
     * @param users - User data indexed by username. Usernames are expected to
     * match the uppercase value used by `getUserPropertyValue()`.
     */
    constructor(users: UsersData) {
        this.userObjects = users;
    }

    /**
     * Retrieves a user's password from AWS Secrets Manager.
     *
     * The user's `passwordName` property determines the AWS secret name. When
     * that property is not configured, `test-user-standard` is used. The secret
     * may contain a raw password, a JSON string, or a JSON object with a string
     * `password` property.
     *
     * @param user - User whose password should be retrieved from the configured
     * users object.
     * @param secretRole - ARN of the AWS role to assume when retrieving the
     * secret.
     * @param secretEnv - AWS environment used to build the secret path.
     * @returns The password retrieved from the key store.
     * @throws Error when the user does not exist, AWS does not return a string,
     * the secret is empty, or its JSON value does not contain a valid password.
     */
    async getPasswordFromKeyStore(user: string, secretRole: string, secretEnv: string): Promise<string> {
        const passwordProperty = 'passwordName';
        let passwordName = 'test-user-standard';

        try {
            passwordName = String(this.getUserPropertyValue(user, passwordProperty));
            await new Promise<void>((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
            if (!(error instanceof Error) || !error.message.includes(passwordProperty)) {
                throw error;
            }
        }

        const secretName = `${secretEnv}/YOUR_PATH/${passwordName}`;
        const secretObj: unknown = await aws.getSecretFromAws(secretRole, secretName);

        if (typeof secretObj !== 'string') {
            throw new Error(`Secret ${secretName} did not return a string value.`);
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(secretObj.trim()) as unknown;
        } catch {
            if (secretObj.length > 0) {
                return secretObj;
            }
            throw new Error(`Secret ${secretName} is empty or not valid JSON.`);
        }

        if (parsed !== null && typeof parsed === 'object' && 'password' in parsed && typeof parsed.password === 'string') {
            return parsed.password;
        }
        if (typeof parsed === 'string') {
            return parsed;
        }

        throw new Error(`Secret ${secretName} JSON is missing a valid password field.`);
    }

    /**
     * Gets the value of a property belonging to a configured user.
     *
     * User lookup is case-insensitive because the supplied username is
     * normalized to uppercase before accessing the user configuration.
     *
     * @param user - Valid username to locate in the configured users object.
     * @param property - Property name whose value should be returned.
     * @returns The configured property value.
     * @throws Error when the user is not found.
     * @throws Error when the requested property is not found for the user.
     */
    getUserPropertyValue(user: string, property: string): unknown {
        const normalizedUser = user.toUpperCase();
        const userData = this.userObjects[normalizedUser];

        if (!userData) {
            throw new Error(`${normalizedUser} user is not found`);
        }
        if (property in userData) {
            return userData[property];
        }
        throw new Error(`${property} key is not found`);
    }
}
