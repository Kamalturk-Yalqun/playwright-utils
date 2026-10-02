import { expect, type APIResponse } from '@playwright/test';
import { jsonHelper as jsonHelpers } from '../utilities';

type ExpectedApiValue = string | number | boolean;
type AssertionType = 'soft' | 'hard';

/**
 * Provides helper methods for validating API responses and comparing them with database results.
 */
class ApiValidations {
    /**
     * Validates a property in an API response, including properties nested within the response body.
     *
     * @param response - Playwright API response to validate.
     * @param keyName - Name of the property to validate.
     * @param value - Expected property value.
     * @param assertionType - Whether to perform a soft or hard assertion.
     */
    async validateApiResponseProperty(response: APIResponse, keyName: string, value: ExpectedApiValue, assertionType: AssertionType = 'soft'): Promise<void> {
        const jsonResponse = await response.json();
        const actualValue = jsonHelpers.getFirstValueByKey(keyName, jsonResponse);
        const customMessage = `Expected property '${keyName}' to have the value '${value}', but found '${actualValue}'`;

        if (assertionType === 'soft') {
            expect.soft(actualValue, customMessage).toEqual(value);
        } else {
            expect(actualValue, customMessage).toEqual(value);
        }
    }

    /**
     * Validates that an API response body matches database query results.
     *
     * @param apiResponse - Playwright API response to validate.
     * @param databaseResponse - Rows returned by the database query.
     */
    async validateAPIResponseMatchesDatabase(apiResponse: APIResponse, databaseResponse: Record<string, unknown>[]): Promise<void> {
        const apiResults = await apiResponse.json();
        const diff = jsonHelpers.showDifferencesBetweenObjects(databaseResponse as never, apiResults);
        expect(diff, 'Check API Response matches database query result').toBeNull();
    }

    /**
     * Validates an API response status code.
     *
     * @param response - Playwright API response to validate.
     * @param statusCode - Expected HTTP status code.
     */
    validateApiResponseStatusCode(response: APIResponse, statusCode: number): void {
        const actualStatusCode = response.status();
        expect(actualStatusCode, `Expected status code '${statusCode}', but received '${actualStatusCode}'`).toEqual(statusCode);
    }
}

export const apiValidations = new ApiValidations();
