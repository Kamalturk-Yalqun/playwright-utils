import { request, type APIRequestContext } from '@playwright/test';
import { awsSecretsManager as aws } from '../../aws';
import { users } from '../../resources';
import { Users, utilities as automationUtilities } from '../../utilities';
import { azureAdAuth as auth } from '../azure-ad-authentication';

interface D365AuthEnvironment {
    secretRoleArn?: string;
    awsEnv?: string;
}

/**
 * Class that contains functions related to api authentication and api context creation
 * This class exports an instance of itself
 */
class ApiAuth {
    /**
     * Creates an API request context with a bearer token for the target D365 resource.
     * The AWS settings are resolved from the provided object, falling back to
     * process.env values when not supplied.
     *
     * @param user - User name used to resolve the email and password from the key store.
     * @param envVariables - Optional configuration object for AWS and D365 values.
     * @param envVariables.secretRoleArn - AWS role ARN used to access secrets.
     * @param envVariables.awsEnv - AWS environment name.
     * @returns API request context configured with an Authorization header.
     */
    async authenticateToD365ApiAs(
        user: string,
        { secretRoleArn = automationUtilities.requireEnv('SECRET_ROLE_ARN'), awsEnv = automationUtilities.requireEnv('AWS_ENV') }: D365AuthEnvironment = {},
    ): Promise<APIRequestContext> {
        const usersPage = new Users(users);
        const username = usersPage.getUserPropertyValue(user, 'userEmail') as string;
        const pwd = await usersPage.getPasswordFromKeyStore(user, secretRoleArn, awsEnv);
        const clientId = await aws.getSecretFromAws(secretRoleArn, automationUtilities.requireEnv('D365_CLIENT_ID_SECRET_NAME'));
        const clientSecret = await aws.getSecretFromAws(secretRoleArn, automationUtilities.requireEnv('D365_CLIENT_SECRET_SECRET_NAME'));
        const token = await auth.getAuthTokenForResourceWithImpersonation(
            automationUtilities.requireEnv('D365_RESOURCE'),
            clientId,
            clientSecret,
            username,
            pwd,
        );

        return request.newContext({
            extraHTTPHeaders: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Prefer: 'odata.include-annotations="*"',
            },
        });
    }
}

export const apiAuth = new ApiAuth();
