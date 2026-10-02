import { request, type APIRequestContext } from '@playwright/test';
import { azureAdAuth as auth } from '../api';
import { awsSecretsManager as aws } from '../aws';

type HttpHeaders = Record<string, string>;

/** Creates authenticated Playwright API request contexts for APIs, lambdas, and microservices. */
class ApiContextHelper {
    /**
     * Creates an API request context with a bearer token and optional additional headers.
     *
     * @param token - Authentication token.
     * @param header - Additional HTTP headers.
     * @param ignoreHTTPSErrors - Whether HTTPS errors should be ignored.
     * @returns An authenticated Playwright API request context.
     */
    async getRequestContextWithHeaders(token: string, header: HttpHeaders | null = null, ignoreHTTPSErrors = false): Promise<APIRequestContext> {
        const httpHeader: HttpHeaders = { Authorization: `Bearer ${token}` };
        if (header) {
            Object.assign(httpHeader, header);
        }

        return request.newContext({
            extraHTTPHeaders: httpHeader,
            ignoreHTTPSErrors,
        });
    }

    /**
     * Creates an authenticated API request context for a lambda using credentials from AWS Secrets Manager.
     *
     * @param clientIdSecretName - AWS secret containing the client ID.
     * @param clientSecretSecretName - AWS secret containing the client secret.
     * @param scope - Access-request scope, usually the application URI with a `.default` suffix.
     * @param header - Additional HTTP headers.
     * @param ignoreHTTPSErrors - Whether HTTPS errors should be ignored.
     */
    async getRequestContextForLambda(
        clientIdSecretName: string,
        clientSecretSecretName: string,
        scope: string,
        header: HttpHeaders | null = null,
        ignoreHTTPSErrors = false,
    ): Promise<APIRequestContext> {
        const roleArn = this.getRequiredEnvironmentVariable('SECRET_ROLE_ARN');
        const clientId = await aws.getSecretFromAws(roleArn, clientIdSecretName);
        const clientSecret = await aws.getSecretFromAws(roleArn, clientSecretSecretName);
        const token = await auth.getAuthTokenForApplication(scope, clientId, clientSecret);
        return this.getRequestContextWithHeaders(token, header, ignoreHTTPSErrors);
    }

    /**
     * Creates an authenticated microservice API request context using JSON credentials from AWS Secrets Manager.
     *
     * @param clientIdSecretName - AWS secret containing the client ID object.
     * @param clientSecretSecretName - AWS secret containing the client-secret object.
     * @param scope - Access-request scope, usually the application URI with a `.default` suffix.
     * @param header - Additional HTTP headers.
     * @param ignoreHTTPSErrors - Whether HTTPS errors should be ignored.
     */
    async getRequestContextForMicroServices(
        clientIdSecretName: string,
        clientSecretSecretName: string,
        scope: string,
        header: HttpHeaders | null = null,
        ignoreHTTPSErrors = false,
    ): Promise<APIRequestContext> {
        const roleArn = this.getRequiredEnvironmentVariable('SECRET_ROLE_ARN');
        const clientIdKey = this.getRequiredEnvironmentVariable('CLIENT_ID_KEY');
        const clientSecretKey = this.getRequiredEnvironmentVariable('CLIENT_SECRET_KEY');
        const clientIdObject = JSON.parse(await aws.getSecretFromAws(roleArn, clientIdSecretName)) as Record<string, string>;
        const clientSecretObject = JSON.parse(await aws.getSecretFromAws(roleArn, clientSecretSecretName)) as Record<string, string>;
        const clientId = clientIdObject[clientIdKey];
        const clientSecret = clientSecretObject[clientSecretKey];

        if (!clientId || !clientSecret) {
            throw new Error('Client ID or client secret was not found in the configured AWS secrets');
        }

        const token = await auth.getAuthTokenForApplication(scope, clientId, clientSecret);
        return this.getRequestContextWithHeaders(token, header, ignoreHTTPSErrors);
    }

    private getRequiredEnvironmentVariable(name: string): string {
        const value = process.env[name];
        if (!value) {
            throw new Error(`${name} is required`);
        }
        return value;
    }
}

export const apiContextHelper = new ApiContextHelper();
