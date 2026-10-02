import { type Page } from '@playwright/test';
import { microsoftUsers } from '../../resources/test-users';
import { LoginPage as AutomationLoginPage, BasePage } from '../../ui';
import { Users } from '../../utilities';
import { utilities as automationUtilities } from '../../utilities/utilities';

export class LoginPage extends BasePage {
    /**
     * @param page - the playwright page object that is tied to this page
     */
    constructor(page: Page) {
        super(page);
    }

    /** Helper Functions */

    /**
     * Login as a user into the application using microsoft credentials.
     * @param userEmail - user email address for login
     * @param userPassword - user password for login
     */
    async msLoginWithCred(userEmail: string, userPassword: string): Promise<void> {
        const mLogin = new AutomationLoginPage(this.page);
        await mLogin.microsoftLogin(userEmail, userPassword);
    }

    /**
     * Login as a user into the application using given user's credentials.
     * @param user - the user's identifier.
     */
    async loginMSAs(user: string): Promise<void> {
        const usersPage = new Users(microsoftUsers);
        const userEmail = usersPage.getUserPropertyValue(user, 'userEmail');
        if (typeof userEmail !== 'string') {
            throw new Error(`The email configured for ${user} is not a string.`);
        }
        const userPassword = await usersPage.getPasswordFromKeyStore(
            user,
            automationUtilities.requireEnv('SECRET_ROLE_ARN'),
            automationUtilities.requireEnv('AWS_ENV'),
        );
        await this.msLoginWithCred(userEmail, userPassword);
    }
}
