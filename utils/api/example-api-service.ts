import { BaseApiPage } from './base-api-page';
import type { APIRequestContext, BrowserContext } from '@playwright/test';

export class ExampleApiService extends BaseApiPage {
    /**
     * Creates an API service bound to the provided Playwright request context.
     *
     * @param context - The current authenticated context, which can be either a BrowserContext or APIRequestContext.
     */
    constructor(context: APIRequestContext | BrowserContext) {
        super(context);
    }

    /**
     * Sends an API request to check the health of the service.
     *
     * @returns The Playwright response object.
     */
    async checkHealth(): Promise<any> {
        return this.context.get(`${this.BASE_URL}/health`);
    }
}
