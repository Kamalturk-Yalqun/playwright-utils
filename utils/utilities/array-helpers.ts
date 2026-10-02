/** Provides helper operations for sorting, comparing, and selecting values from arrays. */
class ArrayHelper {
    /**
     * Sorts an array of objects in place by a numeric property.
     *
     * This method modifies the supplied array by using `Array.sort()` to order
     * its objects according to the numeric value of the specified property.
     *
     * @param key - Name of the numeric object property used for sorting.
     * @param array - Array of objects to sort in place.
     * @returns The same array, sorted in ascending order.
     */
    sortArrayByKey<T, K extends keyof T>(key: K, array: T[]): T[] {
        array.sort((a, b) => Number(a[key]) - Number(b[key]));
        return array;
    }

    /**
     * Compares two unordered arrays while respecting the number of occurrences
     * of each element.
     *
     * @param arr1 - First array to compare.
     * @param arr2 - Second array to compare.
     * @returns `true` when both arrays contain the same elements with the same
     * duplicate counts; otherwise, `false`.
     */
    arraysEqual<T>(arr1: readonly T[], arr2: readonly T[]): boolean {
        if (arr1.length !== arr2.length) {
            return false;
        }

        const countMap = new Map<T, number>();
        for (const element of arr1) {
            countMap.set(element, (countMap.get(element) ?? 0) + 1);
        }

        for (const element of arr2) {
            const count = countMap.get(element);
            if (count === undefined) {
                return false;
            }

            if (count === 1) {
                countMap.delete(element);
            } else {
                countMap.set(element, count - 1);
            }
        }

        return countMap.size === 0;
    }

    /**
     * Returns a random element from a non-empty array.
     *
     * @param arr - Array from which to select an element.
     * @returns A randomly selected element from the array.
     * @throws Error when the input is not an array.
     * @throws Error when the input array is empty.
     */
    pickRandomElementFromArray<T>(arr: readonly T[]): T {
        if (!Array.isArray(arr)) {
            throw new Error('The input is not an array');
        }
        if (arr.length === 0) {
            throw new Error('The input array is empty');
        }
        return arr[Math.floor(Math.random() * arr.length)];
    }
}

export const arrayHelper = new ArrayHelper();
