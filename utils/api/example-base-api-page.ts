import { type APIRequestContext, type BrowserContext } from '@playwright/test';
import { utilities as automationUtilities } from '../utilities/utilities';
import { BaseApiPage } from './base-api-page';

/**
 * Example base API page that sets the base URL and context to be used for sending requests via the API
 */
export class YourBaseApiPage extends BaseApiPage {
    /**
     * Sets the APIRequestContext and base url for API requests
     * @param context - the current authenticated context, it can be either a browser context or api request context object
     */
    constructor(context: APIRequestContext | BrowserContext) {
        super(context, automationUtilities.requireEnv('YOUR_API_BASE_URL'));
    }
}
