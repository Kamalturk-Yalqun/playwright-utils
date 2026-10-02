import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
dotenv.config({ path: './env/.env.local', override: true, quiet: true });

if (process.env.TEST_ENV === 'test') {
    dotenv.config({ path: './env/test.env' });
} else if (process.env.TEST_ENV === 'stage') {
    dotenv.config({ path: './env/stage.env' });
} else {
    dotenv.config({ path: './env/uat.env' });
}

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    timeout: 180000,
    testDir: './tests',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Retry on CI only */
    retries: process.env.CI ? 1 : 0,
    /* Limit the number of workers on CI, use default locally */
    ...(process.env.CI ? { workers: 2 } : {}),
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [
        ['html', { outputFolder: 'reports/playwright' }],
        ['junit', { outputFile: 'results.xml' }],
        //['./qmetry-reporter.ts', { outputFile: 'qtm-results.xml' }],
    ],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        headless: Boolean(process.env.CI),
        screenshot: 'only-on-failure',
        viewport: { width: 1282, height: 641 },
        deviceScaleFactor: 1,
        launchOptions: {
            args: ['--window-size=1920,1080'],
        },
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
    },
    /* Configure projects for major browsers */
    projects: [{ name: 'chromium' }],
});
