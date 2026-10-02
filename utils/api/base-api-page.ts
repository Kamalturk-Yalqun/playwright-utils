import { type APIRequestContext, type BrowserContext } from '@playwright/test';

/**
 * Base API page that sets the request context used for API calls.
 */
export class BaseApiPage {
    context: APIRequestContext;
    BASE_URL: string;

    /**
     * Creates a base API page with the provided Playwright request context.
     *
     * @param context - The current authenticated context, which can be either a BrowserContext or APIRequestContext.
     * @param baseUrl - Optional base URL for requests. If omitted, the value from the API_BASE_URL environment variable is used.
     */
    constructor(context: APIRequestContext | BrowserContext, baseUrl?: string) {
        // Accept self signed certificates
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        // If the context is a BrowserContext object, get the APIRequestContext from it.
        this.context = 'request' in context ? context.request : context;

        if (baseUrl) {
            this.BASE_URL = baseUrl;
        } else {
            this.BASE_URL = process.env.API_BASE_URL ?? '';
        }
    }
}
