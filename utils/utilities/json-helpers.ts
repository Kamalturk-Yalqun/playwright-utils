import { getDiff } from 'json-difference';
import equal from 'node-json-equal';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

interface JsonDifference {
    added: unknown[];
    removed: unknown[];
    edited: unknown[];
    [key: string]: unknown;
}

interface FieldSelection {
    fields: string[];
}

interface MismatchedValue {
    expected: unknown;
    actual: unknown;
}

interface MatchResult {
    mismatchedKeys: Record<string, MismatchedValue>;
    matchedKeys: Record<string, unknown>;
    fieldData: string[];
    missingKeys: string[];
}

/**
 * Provides utilities for searching, comparing, and validating JSON-compatible data.
 */
class JsonHelper {
    /**
     * Recursively searches a JSON object and returns the first value associated with a key.
     *
     * @param key - Key to find.
     * @param jsonObj - JSON object to search.
     * @returns The first truthy matching value, or `null` when no matching value is found.
     */
    getFirstValueByKey(key: string, jsonObj: JsonObject): JsonValue | null {
        // Check if the key was found, and return the value or null if not found
        const foundValue = this.findFirstValueByKey(key, jsonObj);
        return foundValue || null;
    }

    private findFirstValueByKey(key: string, obj: JsonValue): JsonValue | null {
        if (obj === null || typeof obj !== 'object') {
            return null;
        }
        if (!Array.isArray(obj) && Object.prototype.hasOwnProperty.call(obj, key)) {
            return obj[key];
        }
        for (const valueToSearch of Object.values(obj)) {
            if (valueToSearch !== null && typeof valueToSearch === 'object') {
                const value = this.findFirstValueByKey(key, valueToSearch);
                if (value !== null && typeof value !== 'undefined') {
                    return value;
                }
            }
        }
        return null;
    }

    /**
     * Compares two JSON values for deep equality regardless of object-property or array order.
     *
     * @param obj1 - First value to compare.
     * @param obj2 - Second value to compare.
     * @returns Whether the values are deeply equal.
     */
    checkObjectsForEquality(obj1: JsonValue, obj2: JsonValue): boolean {
        // checks if obj1 is null or not an object. If true, compares obj1 and obj 2 and returns result
        if (obj1 === null || typeof obj1 !== 'object') {
            return obj1 === obj2;
        }

        if (Array.isArray(obj1)) {
            return this.checkArraysForEquality(obj1, obj2);
        }

        if (obj2 === null || typeof obj2 !== 'object' || Array.isArray(obj2)) {
            return false;
        }

        return this.checkJsonObjectsForEquality(obj1, obj2);
    }

    private checkArraysForEquality(obj1: JsonValue[], obj2: JsonValue): boolean {
        if (!Array.isArray(obj2) || obj1.length !== obj2.length) {
            return false;
        }
        // Uses node-json-equal to compare arrays without considering element order.
        return !!equal(obj1, obj2, { arrayOrder: false });
    }

    private checkJsonObjectsForEquality(obj1: JsonObject, obj2: JsonObject): boolean {
        const obj1Keys = Object.keys(obj1);
        const obj2Keys = Object.keys(obj2);

        if (obj1Keys.length !== obj2Keys.length) {
            return false;
        }

        return obj1Keys.every((key) => Object.prototype.hasOwnProperty.call(obj2, key) && this.checkObjectsForEquality(obj1[key], obj2[key]));
    }

    /**
     * Compares two JSON objects and returns their additions, removals, and edits.
     *
     * @param obj1 - First object to compare.
     * @param obj2 - Second object to compare.
     * @returns The differences, or `null` when the objects do not differ.
     */
    showDifferencesBetweenObjects(obj1: JsonObject, obj2: JsonObject): JsonDifference | null {
        // uses npm json-difference package to check differences between two objects
        const difference = getDiff(obj1, obj2) as JsonDifference;
        // checks if added, removed, and edited arrays are empty - returns null if empty
        if (difference.added.length === 0 && difference.removed.length === 0 && difference.edited.length === 0) {
            return null;
        }
        // if there is a difference between objects, the difference is returned
        return difference;
    }

    /**
     * Finds every object containing the requested key-value pair.
     *
     * @param keyName - Key to match.
     * @param value - Value to match.
     * @param jsonObj - JSON value to search.
     * @returns Matching objects, or `null` when there are no matches.
     */
    getAllValuesByKey(keyName: string, value: JsonValue, jsonObj: JsonValue | undefined): JsonObject[] | null {
        const result = this.findMatchingValue(keyName, value, jsonObj);
        if (result.length === 0) {
            return null;
        }
        return result;
    }

    /**
     * Recursively collects objects containing the requested key-value pair.
     *
     * @param keyName - Key to match.
     * @param value - Non-object value to match.
     * @param jsonObj - JSON value to search.
     * @returns Objects containing the matching key-value pair.
     */
    findMatchingValue(keyName: string, value: JsonValue, jsonObj: JsonValue | undefined): JsonObject[] {
        let result: JsonObject[] = [];
        if (jsonObj === null || jsonObj === undefined || typeof jsonObj !== 'object') {
            return result;
        }

        if (!Array.isArray(jsonObj) && jsonObj[keyName] === value) {
            result.push(jsonObj);
        }

        for (const subObject of Object.values(jsonObj)) {
            if (subObject !== null && typeof subObject === 'object') {
                result = result.concat(this.findMatchingValue(keyName, value, subObject));
            }
        }

        return result;
    }

    /**
     * Compares selected fields between flat expected and actual data objects.
     *
     * @param fields - Field names to compare.
     * @param data - Expected flat data object.
     * @param actual - Actual flat data object.
     * @returns Matched, mismatched, and missing fields.
     */
    checkForMatches(
        fields: FieldSelection | null | undefined,
        data: Record<string, unknown> | null | undefined,
        actual: Record<string, unknown> | null | undefined,
    ): MatchResult {
        if (!fields || !data || !actual) {
            throw new Error('One or more input variables are null or undefined.');
        }

        const mismatchedKeys: Record<string, MismatchedValue> = {};
        const matchedKeys: Record<string, unknown> = {};
        const missingKeys: string[] = [];

        //loop list of keys(fields) to compare data (expected) with actual (actual)
        for (const key of fields.fields) {
            const { [key]: expected } = data;
            const { [key]: value } = actual;

            if (expected === undefined || value === undefined) {
                missingKeys.push(key);
            } else if (expected === value) {
                matchedKeys[key] = value;
            } else {
                mismatchedKeys[key] = {
                    expected,
                    actual: value,
                };
            }
        }

        return {
            mismatchedKeys,
            matchedKeys,
            fieldData: fields.fields,
            missingKeys,
        };
    }

    /**
     * Verifies if an object contains all the key-value pairs in the given message filter.
     *
     * @param data - Data object to verify.
     * @param messageFilter - Filter containing key-value pairs to match against the
     * data object. This should only be an object of simple key-value pairs and not nested objects.
     * @returns Whether the data contains every key-value pair in the filter.
     */
    verifyDataStructure(data: JsonValue, messageFilter: JsonObject): boolean {
        if (data === null || messageFilter === null) {
            return false;
        }
        for (const [key, value] of Object.entries(messageFilter)) {
            if (this.getAllValuesByKey(key, value, data) === null) {
                return false;
            }
        }
        return true;
    }

    /**
     * Finds all values in an object that match the given key.
     *
     * @param key - Key to search for.
     * @param object - JSON value to search.
     * @returns Every value associated with the key.
     */
    findAllValuesInObject(key: string, object: JsonValue | undefined): JsonValue[] {
        const results: JsonValue[] = [];
        if (object === null || object === undefined || typeof object !== 'object') {
            return results;
        }

        for (const property in object) {
            if (Object.prototype.hasOwnProperty.call(object, property)) {
                if (property === key) {
                    results.push(object[property]);
                } else if (typeof object[property] === 'object' && object[property] !== null) {
                    results.push(...this.findAllValuesInObject(key, object[property]));
                }
            }
        }
        return results;
    }
}

export const jsonHelper = new JsonHelper();
