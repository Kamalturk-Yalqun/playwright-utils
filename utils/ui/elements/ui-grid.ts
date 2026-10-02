import { type Locator } from '@playwright/test';

class UiGrid {
    /** Helper Functions */

    /**
     * Retrieves the total count of rows present in the UI Grid.
     * This method utilizes the `uiGridObj` locator reference to count the total number of rows
     * within the UI Grid.
     * The method specifically searches for elements with the class `.ui-grid-row` within the provided UI Grid object.
     * The `.ui-grid-row` class is commonly used to represent individual rows in a UI Grid. By counting the number of
     * these elements, we can determine the total number of rows present in the UI Grid.
     * @param uiGridObj - the ui grid object to interact with
     * @returns A promise that resolves to the integer count of rows in the UI Grid.
     */
    async getTotalRowCountFromTheUiGrid(uiGridObj: Locator): Promise<number> {
        await uiGridObj.waitFor({ state: 'visible' });
        const totalRowCount = await uiGridObj.locator(' .ui-grid-row').count();
        return totalRowCount;
    }
}

export const uiGrid = new UiGrid();
