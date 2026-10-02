import type { APIRequestContext, BrowserContext } from '@playwright/test';
import { utilities as automationUtilities } from '../../utilities';
import { BaseApiPage } from '../base-api-page';

/**
 * D365 base API page that sets the base URL and context to be used to send requests
 */
export class D365BaseApiPage extends BaseApiPage {
    BASE_URL: string = automationUtilities.requireEnv('D365_API_BASE_URL');

    /**
     * Sets the APIRequestContext and base url for API requests
     * @param context - the current authenticated context, it can be either a browser context or api request context object
     */
    constructor(context: APIRequestContext | BrowserContext) {
        super(context);
    }
}
