import { test as base, expect } from '@playwright/test';
import { release } from 'node:os';
import { customLogger as logger } from '../../utilities';

type AutoFixtures = {
    saveLogs: void;
    runtimeProperties: void;
    datadogTags: void;
};

/** Playwright test extended with automatic logs, runtime metadata, and Datadog tags. */
const test = base.extend<AutoFixtures>({
    saveLogs: [
        async ({}, use, testInfo): Promise<void> => {
            await use();

            if (testInfo.status !== testInfo.expectedStatus) {
                const message = testInfo.errors[0]?.message ?? 'Unknown test failure';
                logger.log('error', `${message} at ${testInfo.file}`);
            }

            testInfo.attachments.push({ name: 'Logs', contentType: 'text/plain', path: 'logs/log.log' });
        },
        { auto: true },
    ],
    runtimeProperties: [
        async ({}, use, testInfo): Promise<void> => {
            testInfo.annotations.push({ type: 'TEST_ENV', description: process.env.TEST_ENV });
            testInfo.annotations.push({ type: 'AWS_ENV', description: process.env.AWS_ENV });
            testInfo.annotations.push({ type: 'TAGS', description: testInfo.tags.join(',') });
            await use();
        },
        { auto: true },
    ],
    datadogTags: [
        async ({}, use, testInfo): Promise<void> => {
            await use();

            const entityAnnotation = testInfo.annotations.find((annotation) => annotation.type === 'testEntityKey')?.description ?? 'No entity key found';

            testInfo.annotations.push({
                type: 'DD_TAGS[test.QMetry_testEntityKey]',
                description: entityAnnotation,
            });
            testInfo.annotations.push({
                type: 'DD_TAGS[test.test_env]',
                description: process.env.TEST_ENV,
            });

            if (testInfo.tags.length === 0) {
                testInfo.annotations.push({
                    type: 'DD_TAGS[test.playwright_tags]',
                    description: 'No tag available',
                });
            } else {
                for (const tag of testInfo.tags) {
                    testInfo.annotations.push({
                        type: `DD_TAGS[test.playwright_tags.${tag}]`,
                        description: 'true',
                    });
                }
            }

            const majorVersion = release().trim().split('.')[0];
            testInfo.annotations.push({ type: 'DD_TAGS[os.version]', description: majorVersion });

            const majorNodeVersion = process.version.split('.')[0];
            testInfo.annotations.push({ type: 'DD_TAGS[runtime.version]', description: majorNodeVersion });
        },
        { auto: true },
    ],
});

export { expect, test };
