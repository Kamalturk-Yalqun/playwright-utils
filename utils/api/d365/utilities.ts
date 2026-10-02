import type { Locator, Page } from '@playwright/test';

declare global {
    interface Window {
        UCWorkBlockTracker: {
            isAppIdle(): boolean;
        };
    }
}

class Utilities {
    /**
     * Waits for the the isAppIdle function to return true indicating the page has finished loading
     * @param page - the playwright page object that is tied to the current page
     * @param timeout - maximum time to wait in milliseconds, defaults to 60000
     */
    async waitForAppIdle(page: Page, timeout = 120_000): Promise<void> {
        await page.waitForFunction(() => window.UCWorkBlockTracker.isAppIdle(), {}, { timeout });
    }

    /**
     * Closes the calling just got easier popup
     * @param page - the playwright page object that is tied to the current page
     */
    async closeCallingJustGotEasier(page: Page): Promise<void> {
        await this.btnGotIt(page).click();
        await this.waitForAppIdle(page);
    }

    btnGotIt(page: Page): Locator {
        return page.getByText('Got it');
    }
}

export const utilities = new Utilities();
