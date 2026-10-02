import { test as base, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { users as userData } from '../utils/authentication/test-users';
import type { Username } from '../utils/user-names';
import { Users, utilities } from '../utils/utilities';

/**
 * Worker-level session accessor used by the page fixture.
 *
 * It returns:
 * - page: active page for the requested user
 * - isReusedSession: true when the existing worker session was reused
 *
 * Reused sessions skip login and only navigate to home for a clean start.
 */
type WorkerSessionFixture = {
    getPageForUser(user: string): Promise<{ page: Page; isReusedSession: boolean }>;
    invalidateSession(): Promise<void>;
};

/**
 * UI test fixture strategy:
 *
 * 1) Keep one browser context/page per worker for the active user.
 * 2) Reuse that session across tests when the requested user is unchanged.
 * 3) If user changes, close previous context and create a fresh logged-in session.
 * 4) Tear down the worker session once when the worker finishes.
 *
 * This reduces repeated login cost while preserving user isolation rules.
 */
export const test = base.extend<Username, { uiWorkerSession: WorkerSessionFixture }>({
    username: ['YOUR_USERNAME', { option: true }],
    uiWorkerSession: [
        async ({ browser }, use) => {
            // Tracks the currently active user/session for this worker.
            let activeUser: string | null = null;
            let activeContext: BrowserContext | null = null;
            let activePage: Page | null = null;

            const uiWorkerSession: WorkerSessionFixture = {
                async getPageForUser(user: string): Promise<{ page: Page; isReusedSession: boolean }> {
                    // Build a new session when:
                    // - first test in worker
                    // - page/context is no longer valid
                    // - test requests a different username than current session
                    const needsFreshSession = !activeContext || !activePage || activePage.isClosed() || activeUser !== user;

                    if (needsFreshSession) {
                        // Ensure previous user session is fully cleaned up before relogin.
                        if (activeContext !== null) {
                            await activeContext.close();
                        }

                        // Login flow creates a brand new authenticated context/page.
                        const loginSession = await loginToYourAppSites(browser, user);
                        activeUser = user;
                        activeContext = loginSession.context;
                        activePage = loginSession.page;
                        return { page: activePage, isReusedSession: false };
                    }

                    if (!activePage) {
                        throw new Error('Expected an active page for the current worker session.');
                    }

                    // Same user, same worker: continue using the existing authenticated session.
                    return { page: activePage, isReusedSession: true };
                },
                async invalidateSession(): Promise<void> {
                    const contextToClose = activeContext;
                    if (contextToClose !== null) {
                        await contextToClose.close();
                    }
                    activeUser = null;
                    activeContext = null;
                    activePage = null;
                },
            };

            await use(uiWorkerSession);

            // Worker shutdown cleanup: close any remaining browser context once.
            const finalContextToClose = activeContext as BrowserContext | null;
            if (finalContextToClose !== null) {
                await finalContextToClose.close();
                activeContext = null;
            }
        },
        { scope: 'worker' },
    ],
    page: [
        async ({ uiWorkerSession, username }, use, testInfo) => {
            const { page, isReusedSession } = await uiWorkerSession.getPageForUser(username);

            if (isReusedSession) {
                // Reused session should start from Home, not login.
                // This resets navigation state while preserving authenticated cookies/session.
                await page.goto(`${process.env.BASE_URL ?? ''}/home/ui/`);
                await page.waitForLoadState('domcontentloaded');
                await expect(page).toHaveTitle('Home');
            }

            // Add user context to test report for easier debugging and triage.
            testInfo.annotations.push({ type: 'USER', description: username });
            await use(page);

            // If this test failed, discard the entire browser session so the next test
            // starts from a guaranteed clean login/context regardless of username.
            if (testInfo.status === 'failed' || testInfo.status === 'timedOut') {
                await uiWorkerSession.invalidateSession();
                return;
            }

            // Keep only the primary reusable page between tests.
            // Any additional tabs/popups opened by the test are cleaned up here.
            const allPages = page.context().pages();
            const extraPages = allPages.filter((candidatePage: Page) => candidatePage !== page && !candidatePage.isClosed());
            await Promise.all(extraPages.map(async (extraPage: Page) => extraPage.close()));
        },
        { scope: 'test' },
    ],
});

/**
 * Creates a new browser context, performs UI login, and returns authenticated handles.
 *
 * This is only used for fresh sessions (first test for worker/user or user switch).
 */
async function loginToYourAppSites(browser: Browser, user: string): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext();
    const page = await context.newPage();

    const loginUrl = utilities.requireEnv('LOGIN_URL');
    // Navigate to centralized login route defined by environment.
    await page.goto(loginUrl);
    await page.waitForLoadState('domcontentloaded');

    // Resolve username/password from external user registry and key store.
    const usersPage = new Users(userData);
    let username = String(usersPage.getUserPropertyValue(user, 'username'));
    username = username.replace(/^xxxx\\/i, '');
    const pwd = await usersPage.getPasswordFromKeyStore(user, utilities.requireEnv('SECRET_ROLE_ARN'), utilities.requireEnv('AWS_ENV'));

    // Perform UI login and verify landing page.
    await page.getByPlaceholder('User Name').fill(username);
    await page.getByPlaceholder('Password').fill(pwd);
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveTitle('Home');

    return { context, page };
}
