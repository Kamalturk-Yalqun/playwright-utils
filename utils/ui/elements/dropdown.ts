import { type Locator } from '@playwright/test';

class Dropdown {
    /** Helper Functions */

    /**
     * This function counts the options in a dropdown, waiting until the dropdown is visible. Will only work for simple
     * structure of <select> tag with <option>.
     * @param dropdownLocator - The Playwright locator that identifies the dropdown.
     * @returns A Promise that resolves to the number of options. Returns 0 for an empty dropdown.
     * @throws Throws an error if the 'dropdownLocator' is undefined or if the dropdown is not visible.
     */
    async getDropdownOptionsCount(dropdownLocator: Locator): Promise<number> {
        if (!dropdownLocator) {
            throw new Error(`The dropdown locator is undefined`);
        }
        await dropdownLocator.waitFor({ state: 'visible' });
        const dropdownOptions = dropdownLocator.locator('option');
        const dropDownCount = await dropdownOptions.count();
        return dropDownCount;
    }
}

export const dropdown = new Dropdown();
