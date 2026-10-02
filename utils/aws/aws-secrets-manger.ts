import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import { awsSts as sts, type AwsCredentials } from './aws-sts';

/**Support for the AWS Secrets Manager Service*/
class AwsSecretsManager {
    /**
     * Authenticates to AWS Secrets Manager using an assumed role.
     *
     * @param roleCreds - Configuration object containing the credentials.
     * @returns The authenticated Secrets Manager client instance.
     */
    authenticateWithAssumedRole(roleCreds: AwsCredentials): SecretsManager {
        try {
            return new SecretsManager({
                credentials: roleCreds,
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Unable to authenticate, ${message}`);
        }
    }

    /**
     * Obtains the value for the specified secret.
     *
     * @param smSession - An authenticated Secrets Manager session with permission to retrieve the desired secret.
     * @param secretName - The name of the secret to retrieve.
     * @returns The object containing the secret data.
     */
    async getSecret(smSession: SecretsManager, secretName: string): Promise<any> {
        try {
            return await smSession.getSecretValue({ SecretId: secretName });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Unable to obtain the value for secret name ${secretName}, ${message}`);
        }
    }

    /**
     * Assumes a role with access to the secrets and returns the value for the given secret.
     *
     * @param roleArn - The Amazon Resource Name (ARN) of the role to assume.
     * @param secretName - The name of the secret to retrieve.
     * @returns The SecretString value from AWS Secrets Manager.
     */
    async getSecretFromAws(roleArn: string, secretName: string): Promise<string> {
        const stsSession = sts.authenticateToSts();
        const roleCreds = await sts.obtainAssumeRoleCreds(stsSession, roleArn);
        const secretSession = this.authenticateWithAssumedRole(roleCreds);
        const secretData = await this.getSecret(secretSession, secretName);
        if (typeof secretData.SecretString !== 'string') {
            throw new Error(`Secret ${secretName} does not contain a string value`);
        }
        return secretData.SecretString;
    }
}
export const awsSecretsManager = new AwsSecretsManager();
