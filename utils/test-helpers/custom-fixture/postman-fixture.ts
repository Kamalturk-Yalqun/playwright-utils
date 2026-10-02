import { expect, test as base } from '@playwright/test';

type PostmanFixtures = {
    postmanRunUrl: void;
};

/** Playwright test extended with automatic Postman run URL reporting. */
const test = base.extend<PostmanFixtures>({
    postmanRunUrl: [
        async ({}, use, testInfo): Promise<void> => {
            await use();
            testInfo.annotations.push({
                type: 'POSTMAN_TESTRUN_URL',
                description: process.env.POSTMAN_TESTRUN_URL ?? 'No POSTMAN_TESTRUN_URL found',
            });
        },
        { auto: true },
    ],
});

export { expect, test };
