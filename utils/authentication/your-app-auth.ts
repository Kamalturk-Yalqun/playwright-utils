import { expect, request, type APIRequestContext, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { Users } from '../utilities';
import { utilities as automationUtilities } from '../utilities/utilities';
import { JWT } from './jwt';
import { users } from './test-users';

class Auth {
    /** Helper Functions */

    /**
     * Function that creates BrowserContext that contains http credentials
     * SECRET_ROLE_ARN and AWS_ENV should be added as properties in the .env files for this function to work
     * @param browser - playwright browser object
     * @param user - user name
     * @returns Browser Context containing http credentials
     *
     */
    async setHttpCredentials(browser: Browser, user: string): Promise<BrowserContext> {
        // Get the login properties
        const usersPage = new Users(users);
        const username = usersPage.getUserPropertyValue(user, 'username');
        if (typeof username !== 'string') {
            throw new Error(`The username configured for ${user} is not a string.`);
        }
        const pwd = await usersPage.getPasswordFromKeyStore(user, automationUtilities.requireEnv('SECRET_ROLE_ARN'), automationUtilities.requireEnv('AWS_ENV'));
        const options = {
            httpCredentials: {
                username: username,
                password: pwd,
            },
        };
        // Create a new browser context with the credentials
        return browser.newContext(options);
    }

    /**
     * Function that creates a new page from the passed browser context and
     * navigates to to the given url. It also waits for the page to load. You may pass in finalLandingURL in the event of redirects.
     * @param context - playwright browser context object that contains http credentials
     * @param url -  url parameter of the your app site page to navigate to
     * @param finalLandingUrl - optional parameter for the final landing URL, can be partial match.
     * Sometimes, multiple page redirection will happen before system lands into final URL. In such circumstances,
     * we have to wait for page load event until after system lands into final URL. Otherwise, the wait will have no
     * meaning and tests will frequently fail due to time out after landing into final URL. Default value is null.
     * @returns Playwright Page Object
     */
    async navigate(context: BrowserContext, url: string, finalLandingUrl: string | null = null): Promise<Page> {
        const page = await context.newPage();
        await page.goto(url);
        if (finalLandingUrl) {
            await page.waitForURL(finalLandingUrl, { timeout: 20 * 1000 });
        }
        await page.waitForLoadState('domcontentloaded');
        return page;
    }

    /**
     * A combined function that returns an authenticated page object from the passed browser
     * SECRET_ROLE_ARN and AWS_ENV should be added as properties in the .env files for this function to work
     * object and navigates to your app site.The function will navigate to the default your app landing URL - value of YOUR_APP_URL env variable, https://{env}.yourapp.com .
     * The function also handles setting the BASEURL env variable to the value of YOUR_APP_URL env variable which then can be used within the Page Object class.
     * @param browser - playwright browser object
     * @param user - user name
     * @param url - optional url parameter of the your app site page to navigate to. Default value is set to YOUR_APP_URL env variable
     * @param finalLandingUrl - optional parameter for the final landing URL, can be partial match.
     * Sometimes, multiple page redirection will happen before system lands into final URL. In such circumstances,
     * we have to wait for page load event until after system lands into final URL. Otherwise, the wait will have no
     * meaning and tests will frequently fail due to time out after landing into final URL. Default value is null.
     * @returns Playwright Page Object containing http credentials
     */
    async loginToYourApplicationSites(
        browser: Browser,
        user: string,
        url = automationUtilities.requireEnv('YOUR_APP_URL'),
        finalLandingUrl: string | null = null,
    ): Promise<Page> {
        const context = await this.setHttpCredentials(browser, user);
        process.env.BASEURL = automationUtilities.requireEnv('YOUR_APP_URL');
        return this.navigate(context, url, finalLandingUrl);
    }

    /**
     * Function that logs in to your app using JWT authentication.
     * The function will navigate to the default JWT landing URL - value of YOUR_APP_API_BASE_URL env variable, https://jwt.{env}.yourapp.com .
     * It returns a page within a browser context containing an authorization header with a token for the given user.
     * The function also handles setting the BASEURL env variable to the value of YOUR_APP_API_BASE_URL env variable which then can be used within the Page Object class.
     * @param browser - The Playwright browser instance.
     * @param user - the user to authenticate
     * @param url - optional url parameter of the your app site page to navigate to. Default value is set to YOUR_APP_API_BASE_URL env variable
     * @param finalLandingUrl - optional parameter for the final landing URL, can be partial match. Multiple page redirection will happen before system lands into final URL. In such circumstances,
     * we have to wait for page load event until after system lands into final URL. Otherwise, the wait will have no
     * meaning and tests will frequently fail due to time out after landing into final URL. Default value is null.
     * @returns - Playwright Page Object within the context containing the bearer token for the user
     */
    async loginWithJWTToYourAppSites(
        browser: Browser,
        user: string,
        url = automationUtilities.requireEnv('YOUR_APP_API_BASE_URL'),
        finalLandingUrl: string | null = null,
    ): Promise<Page> {
        const jwt = new JWT();
        const token = await jwt.getJwtForUser(user);
        process.env.BASEURL = automationUtilities.requireEnv('YOUR_APP_API_BASE_URL');
        const context = await browser.newContext({
            extraHTTPHeaders: {
                Authorization: `Bearer ${token}`,
            },
            ignoreHTTPSErrors: true,
        });
        return this.navigate(context, url, finalLandingUrl);
    }

    /**
     * Creates an APIRequestContext with an authorization header containing a token for the given user.
     * The context can then be used to make API requests
     * @param user the user to authenticate
     * @returns - a request context containing the bearer token for the user
     */
    async authenticateToYourAppApiAs(user: string): Promise<APIRequestContext> {
        const jwt = new JWT();
        const token = await jwt.getJwtForUser(user);
        return request.newContext({
            extraHTTPHeaders: {
                Authorization: `Bearer ${token}`,
            },
        });
    }

    /**
     * Creates a new browser context, performs UI login, and returns authenticated handles.
     *
     * This is only used for fresh sessions.
     */
    async loginToYourAppSites(browser: Browser, user: string): Promise<{ context: BrowserContext; page: Page }> {
        const context = await browser.newContext();
        const page = await context.newPage();

        const loginUrl = automationUtilities.requireEnv('LOGIN_URL');
        // Navigate to centralized login route defined by environment.
        await page.goto(loginUrl);
        await page.waitForLoadState('domcontentloaded');

        // Resolve username/password from external user registry and key store.
        const usersPage = new Users(users);
        let username = String(usersPage.getUserPropertyValue(user, 'username'));
        username = username.replace(/^xxxx\\/i, '');
        const pwd = await usersPage.getPasswordFromKeyStore(user, automationUtilities.requireEnv('SECRET_ROLE_ARN'), automationUtilities.requireEnv('AWS_ENV'));

        // Perform UI login and verify landing page.
        await page.getByPlaceholder('User Name').fill(username);
        await page.getByPlaceholder('Password').fill(pwd);
        await page.getByRole('button', { name: 'Log In' }).click();
        await expect(page).toHaveTitle('Home');

        return { context, page };
    }
}

export const auth = new Auth();
