import { test } from '@playwright/test';

/** Adds custom annotations to the currently running Playwright test. */
class CustomAnnotations {
    /**
     * Adds a QMetry test ID annotation to the current Playwright test.
     *
     * @param testEntityKey - Entity key for the associated QMetry test case.
     */
    qmetryTestId(testEntityKey: string): void {
        test.info().annotations.push({ type: 'testEntityKey', description: testEntityKey });
    }

    /**
     * Adds a custom annotation to the current Playwright test report.
     *
     * @param annotationType - Self-explanatory annotation type displayed in the report.
     * @param annotationDescription - Annotation description displayed in the report.
     * @throws Error when either argument is `null` or `undefined`.
     */
    addAnnotation(annotationType?: string | null, annotationDescription?: string | null): void {
        if (annotationType == null || annotationDescription == null) {
            throw new Error('annotationType and annotationDescription cannot be null or undefined');
        }
        test.info().annotations.push({ type: annotationType, description: annotationDescription });
    }
}

export const customAnnotations = new CustomAnnotations();
