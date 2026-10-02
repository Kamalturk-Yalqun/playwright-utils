import type { Page } from '@playwright/test';

/**
 * Base class for page objects backed by a Playwright page.
 */
export class BasePage {
    readonly page: Page;

    /**
     * Creates a page object associated with a Playwright page.
     *
     * @param page - Playwright page associated with this page object.
     */
    constructor(page: Page) {
        this.page = page;
    }
}
