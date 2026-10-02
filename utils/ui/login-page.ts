import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base-page';

/** Page object for the Microsoft sign-in flow. */
export class LoginPage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    /** Email-address input. */
    get txtEmail(): Locator {
        return this.page.locator('input[name="loginfmt"]');
    }

    /** Password input. */
    get txtPassword(): Locator {
        return this.page.locator('input[name="passwd"]');
    }

    /** Next button. */
    get btnNext(): Locator {
        return this.page.locator('input[value="Next"]');
    }

    /** Sign-in button. */
    get btnSignIn(): Locator {
        return this.page.locator('input[value="Sign in"]');
    }

    /** Button that declines remaining signed in. */
    get btnStaySignedInNo(): Locator {
        return this.page.locator('#idBtn_Back');
    }

    /**
     * Signs in through the Microsoft login UI.
     *
     * The login page must already be open before this method is called.
     *
     * @param userEmail - User email address.
     * @param userPassword - User password.
     */
    async microsoftLogin(userEmail: string, userPassword: string): Promise<void> {
        await this.page.waitForLoadState('load');
        await this.txtEmail.fill(userEmail);
        await this.btnNext.click();
        await this.page.waitForLoadState('load');
        await new Promise<void>((resolve) => setTimeout(resolve, 2000));

        // Set the password through DOM events to avoid exposing it in the Playwright HTML report.
        await this.txtPassword.waitFor({ state: 'visible', timeout: 60000 });
        await this.txtPassword.waitFor({ state: 'attached', timeout: 60000 });
        await this.txtPassword.evaluate((input: HTMLInputElement, password: string) => {
            input.value = password;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }, userPassword);
        await this.btnSignIn.click();
        await this.page.waitForLoadState('load');

        if (await this.btnStaySignedInNo.isVisible()) {
            await this.btnStaySignedInNo.click();
        }

        await this.page.waitForLoadState('load');
    }
}
