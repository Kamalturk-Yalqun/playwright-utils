import type { Page } from '@playwright/test';

/**
 * Closes the browser context associated with a Playwright page.
 *
 * @param page - Playwright page whose browser context should be closed.
 * @returns A promise that resolves after the browser context is closed.
 */
export async function closeContextFromPage(page: Page): Promise<void> {
    await page.context().close();
}

/**
 * Opens a new browser context from the browser associated with the current
 * page and creates a blank page within that context.
 *
 * @param currentPage - Current Playwright page used to locate the browser.
 * @returns A new blank page in a newly created browser context.
 * @throws Error when the current page is not associated with a browser.
 */
export async function openNewContextWithBlankPage(currentPage: Page): Promise<Page> {
    const currentBrowser = currentPage.context().browser();
    if (!currentBrowser) {
        throw new Error('The current page is not associated with a browser');
    }

    const newContext = await currentBrowser.newContext();
    return newContext.newPage();
}
