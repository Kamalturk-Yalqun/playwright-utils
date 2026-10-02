import { type Locator, type Page } from '@playwright/test';
import { customLogger } from '../../utilities/winston-logger';
import { BasePage } from '../base-page';

export class AngularCommonPage extends BasePage {
    readonly tstErrorToast: Locator;
    readonly tstSuccessToast: Locator;
    readonly tstToastTitles: Locator;
    readonly tstToastMessage: Locator;
    readonly tstCloseToast: Locator;
    readonly spnAngularPages: Locator;

    /**
     *
     * @param page - the playwright page object that is tied to this page
     *
     */
    constructor(page: Page) {
        super(page);
        this.tstErrorToast = page.locator('#toast-container .error');
        this.tstSuccessToast = page.locator('.toast-success');
        this.tstToastTitles = page.locator('.toast-title');
        this.tstToastMessage = page.locator('.toast-message');
        this.tstCloseToast = page.locator('.toast-close-button');
        this.spnAngularPages = page.locator('[class="icon-spinner loading-overlay-image spinning"]');
    }

    /** Helper Functions */

    /**
     * Method checks if an error toast exists on the page. If toast error is present it validates whether message is a litigation message.
     * Litigation error is an expected error in prod at the specific time that should let the test execution continue.
     * In the event of litigation error method would return null, otherwise an actual error message is returned.
     * @returns - returns text of all error messages present on page in the array format
     * @returns - returns null when error has a litigation message or no error present on the page
     */
    async checkForErrorToast(): Promise<string[] | null> {
        await this.waitForPageLoad();

        const toastBodies = this.tstErrorToast.locator('.toast-body');
        const count = await toastBodies.count();
        if (count === 0) {
            return null;
        }

        const litigationMessage = 'The litigation status of the site could not be determined.';

        const messages: string[] = [];
        for (let i = 0; i < count; i++) {
            const raw = await toastBodies.nth(i).textContent();
            const msg = raw?.trim();
            if (msg && msg !== litigationMessage) {
                messages.push(msg);
            }
        }

        return messages.length > 0 ? messages : null;
    }

    /**
     * Method waits for the success toast to be visible. If it doesn't appear before timeout, error is thrown.
     * @param timeout
     * @throws if the success toast did not appear before timing out.
     */
    async waitForSuccessToast(timeout = 30000): Promise<void> {
        try {
            await this.tstSuccessToast.waitFor({ state: 'visible', timeout });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Success message was not received within the expected time. Error details: ${message}`);
        }
    }

    /**
     * Method gets the toast titles if present. If there are no toast titles, it returns null.
     * @returns a promise that resolves to an array of strings containing toast titles.
     * @returns if there is no toast
     */
    async getToastTitles(): Promise<string[] | null> {
        try {
            const toastTitleElements = await this.tstToastTitles.all();
            return Promise.all(toastTitleElements.map(async (element) => (await element.innerText()).trim()));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            customLogger.error(`Failed to get toast titles. Error details: ${message}`);
            return null;
        }
    }

    /**
     * Method gets the toast message if present. If there is no toast, it returns null.
     * @returns - toast message text if toast exists on the page
     * @returns if there is no toast
     */
    async getToastMessage(): Promise<string | null> {
        if (await this.tstToastMessage.isVisible()) {
            return this.tstToastMessage.textContent();
        }
        return null;
    }

    /**
     * Method closes the toast
     */
    async closeToast(): Promise<void> {
        await this.tstCloseToast.click();
    }

    /**
     * Waits for up to 30 seconds the loading spinner to disappear
     * @param timeout - optional parameter for timeout with default set to 30 sec
     */
    async waitForPageLoad(timeout = 30000): Promise<void> {
        const spinCount = await this.spnAngularPages.count();
        for (let spinnerIndex = 0; spinnerIndex < spinCount; spinnerIndex++) {
            await this.spnAngularPages.nth(spinnerIndex).waitFor({ state: 'hidden', timeout });
        }
    }
}
