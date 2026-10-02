import { request, type APIRequestContext } from '@playwright/test';
import { encryptDecrypt } from '../utilities/encrypt-decrypt';

/**
 * Support for authentication to Azure Active Directory.
 */
class AzureAdAuthentication {
    readonly BASE_URL = 'https://login.microsoftonline.com';
    readonly tenantId = 'YOUR_TENANT_ID'; // Replace with your actual tenant ID

    /**
     * Gets an authentication token for Azure Active Directory using the application's identity.
     *
     * @param scope - Application ID URI for the resource affixed with the .default suffix.
     * @param clientId - The application ID.
     * @param clientSecret - The client secret for the app.
     * @returns A bearer token.
     */
    async getAuthTokenForApplication(scope: string, clientId: string, clientSecret: string): Promise<string> {
        const body = {
            grant_type: 'client_credentials',
            scope,
            client_id: clientId,
            client_secret: clientSecret,
        };

        const requestContext: APIRequestContext = await request.newContext();
        const resp = await requestContext.post(`${this.BASE_URL}/${this.tenantId}/oauth2/v2.0/token`, {
            form: body,
        });

        const jsonResp = await resp.json();

        if (!resp.ok()) {
            throw new Error(`Could not generate token due to ${jsonResp.error_description}`);
        }

        return jsonResp.access_token as string;
    }

    /**
     * Gets an authentication token using the application's resource, clientId, and clientSecret.
     *
     * @param resource - Application resource as a string.
     * @param clientId - The application ID as an encrypted string.
     * @param clientSecret - The client secret for the app as an encrypted string.
     * @returns A bearer token.
     */
    async getAuthTokenForResource(resource: string, clientId: string, clientSecret: string): Promise<string> {
        const requestContext: APIRequestContext = await request.newContext();
        const resp = await requestContext.post(`${this.BASE_URL}/${this.tenantId}/oauth2/token`, {
            form: {
                grant_type: 'client_credentials',
                resource,
                client_id: await encryptDecrypt.decrypt(clientId),
                client_secret: await encryptDecrypt.decrypt(clientSecret),
            },
        });

        const jsonResp = await resp.json();

        if (!resp.ok()) {
            throw new Error(`Could not generate token due to ${jsonResp.error_description}`);
        }

        return jsonResp.access_token as string;
    }

    /**
     * Gets an authentication token with password grant type using the application's resource, clientId, clientSecret, username, and password.
     *
     * @param resource - Application resource as a string.
     * @param clientId - The application ID as a decrypted string.
     * @param clientSecret - The client secret for the app as a decrypted string.
     * @param userName - The application username for login.
     * @param password - The password for the app as a decrypted string.
     * @returns A bearer token.
     */
    async getAuthTokenForResourceWithImpersonation(
        resource: string,
        clientId: string,
        clientSecret: string,
        userName: string,
        password: string,
    ): Promise<string> {
        const requestContext: APIRequestContext = await request.newContext();
        const resp = await requestContext.post(`${this.BASE_URL}/${this.tenantId}/oauth2/token`, {
            form: {
                grant_type: 'password',
                resource,
                client_id: clientId,
                client_secret: clientSecret,
                username: userName,
                password,
            },
        });

        const jsonResp = await resp.json();

        if (!resp.ok()) {
            throw new Error(`Could not generate token due to ${jsonResp.error_description}`);
        }

        return jsonResp.access_token as string;
    }
}

export const azureAdAuth = new AzureAdAuthentication();
