import { STS } from '@aws-sdk/client-sts';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

export type AwsCredentials = {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
};

/** Support for the AWS Security Token Service (STS). */
class AwsSts {
    AWS_REGION = 'us-east-1';

    /**
     * Authenticates to the AWS Security Token Service (STS).
     *
     * @returns The authenticated STS instance.
     */
    authenticateToSts(): STS {
        process.env.AWS_REGION = this.AWS_REGION;

        try {
            const creds = fromNodeProviderChain();
            return new STS({ credentials: creds });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Unable to authenticate, ${message}.`);
        }
    }

    /**
     * Assumes the provided role and returns the credentials for that role.
     *
     * @param stsSession - An authenticated STS session with permissions to assume the desired role.
     * @param roleArn - The ARN of the role to assume.
     * @returns The credentials for the assumed role.
     */
    async obtainAssumeRoleCreds(stsSession: STS, roleArn: string): Promise<AwsCredentials> {
        const roleName = roleArn.split('/')[1];

        const roleParams = {
            RoleArn: roleArn,
            RoleSessionName: `session${process.hrtime.bigint()}`,
            DurationSeconds: 900,
        };

        try {
            const resp = await stsSession.assumeRole(roleParams);

            const credentials = resp.Credentials;
            if (!credentials?.AccessKeyId || !credentials.SecretAccessKey) {
                throw new Error('STS did not return access key credentials');
            }
            return {
                accessKeyId: credentials.AccessKeyId,
                secretAccessKey: credentials.SecretAccessKey,
                sessionToken: credentials.SessionToken,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Unable to assume the ${roleName} role, ${message}.`);
        }
    }
}

export const awsSts = new AwsSts();
