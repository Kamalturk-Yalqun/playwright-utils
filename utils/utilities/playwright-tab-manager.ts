import type { Locator, Page } from '@playwright/test';

/** Page-object shape accepted by callback-based tab manager operations. */
interface PageObject {
    /** Playwright page whose browser context is monitored for new pages. */
    page: Page;
}

/**
 * Verifies and waits for new pages or popups opened by UI actions, then returns
 * the newly opened Playwright page after its DOM content has loaded.
 */
class TabManager {
    /**
     * Clicks a locator expected to open a new page in the same browser context.
     *
     * @param pageObj - Page object whose `page` context should be monitored.
     * @param elem - Locator whose click action is expected to open a new page.
     * @param timeout - Maximum time in milliseconds to wait for the page event.
     * Defaults to 30 seconds.
     * @returns The newly opened page after its DOM content has loaded.
     * @throws Error when the click fails or no new page opens before the timeout.
     */
    async openToNewPage(pageObj: PageObject, elem: Locator, timeout = 30000): Promise<Page> {
        try {
            const pagePromise = pageObj.page.context().waitForEvent('page', { timeout });
            await elem.click();
            const newPage = await pagePromise;
            await newPage.waitForLoadState('domcontentloaded');
            return newPage;
        } catch (error) {
            throw new Error(`New page is not found on click - ${elem}; \n Error - ${error}`);
        }
    }

    /**
     * Clicks a locator expected to open a new popup in the same browser context.
     *
     * @param pageObj - Page object whose `page` context should be monitored.
     * @param elem - Locator whose click action is expected to open a popup.
     * @param timeout - Maximum time in milliseconds to wait for the popup event.
     * Defaults to 30 seconds.
     * @returns The newly opened popup after its DOM content has loaded.
     * @throws Error when the click fails or no popup opens before the timeout.
     */
    async openNewPopup(pageObj: PageObject, elem: Locator, timeout = 30000): Promise<Page> {
        try {
            const popupPromise = pageObj.page.waitForEvent('popup', { timeout });
            await elem.click();
            const newPopup = await popupPromise;
            await newPopup.waitForLoadState('domcontentloaded');
            return newPopup;
        } catch (error) {
            throw new Error(`New popup is not found for action - ${elem}; \n Error - ${error}`);
        }
    }

    /**
     * Invokes a callback on a page object and returns the popup opened by that
     * action.
     *
     * @param pageObj - Page object containing the Playwright page and callback.
     * @param callbackFunction - Name of a function defined on the page object.
     * @param args - Arguments passed to the callback function. Defaults to an
     * empty array.
     * @param timeout - Maximum time in milliseconds to wait for the popup event.
     * Defaults to 30 seconds.
     * @returns The newly opened popup after its DOM content has loaded.
     * @throws Error when the callback fails, is not a function, or no popup opens
     * before the timeout.
     */
    async openNewPopupWithCallbackFunction<T extends PageObject>(pageObj: T, callbackFunction: string, args: unknown[] = [], timeout = 30000): Promise<Page> {
        try {
            const popupPromise = pageObj.page.waitForEvent('popup', { timeout });
            await this.invokeCallback(pageObj, callbackFunction, args);
            const newPopup = await popupPromise;
            await newPopup.waitForLoadState('domcontentloaded');
            return newPopup;
        } catch (error) {
            throw new Error(`New popup is not found for action - ${callbackFunction}; \n Error - ${error}`);
        }
    }

    /**
     * Invokes a callback on a page object and returns the new page opened by that
     * action.
     *
     * @param pageObj - Page object containing the Playwright page and callback.
     * @param callbackFunction - Name of a function defined on the page object.
     * @param args - Arguments passed to the callback function. Defaults to an
     * empty array.
     * @param timeout - Maximum time in milliseconds to wait for the page event.
     * Defaults to 30 seconds.
     * @returns The newly opened page after its DOM content has loaded.
     * @throws Error when the callback fails, is not a function, or no page opens
     * before the timeout.
     */
    async openToNewPageWithCallbackFunction<T extends PageObject>(pageObj: T, callbackFunction: string, args: unknown[] = [], timeout = 30000): Promise<Page> {
        try {
            const pagePromise = pageObj.page.context().waitForEvent('page', { timeout });
            await this.invokeCallback(pageObj, callbackFunction, args);
            const newPage = await pagePromise;
            await newPage.waitForLoadState('domcontentloaded');
            return newPage;
        } catch (error) {
            throw new Error(`New page is not found for action - ${callbackFunction}; \n Error - ${error}`);
        }
    }

    /**
     * Invokes a named page-object callback with the page object as its receiver.
     *
     * @param pageObj - Page object containing the callback.
     * @param callbackFunction - Name of the callback to invoke.
     * @param args - Arguments passed to the callback.
     * @throws Error when the named member is not a function.
     */
    private async invokeCallback<T extends PageObject>(pageObj: T, callbackFunction: string, args: unknown[]): Promise<void> {
        const callback = (pageObj as Record<string, unknown>)[callbackFunction];
        if (typeof callback !== 'function') {
            throw new Error(`${callbackFunction} is not a function`);
        }
        await callback.apply(pageObj, args as []);
    }
}

export const tabManager = new TabManager();
