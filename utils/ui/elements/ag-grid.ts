import { expect, type Locator } from '@playwright/test';

type SortingType = 'Ascending' | 'Descending';

interface ExpandGridHeightOptions {
    gridObj: Locator;
    height?: string;
}

class AgGrid {
    /** Dynamic Locators */

    horizontalScrollBar(gridObj: Locator): Locator {
        return gridObj.locator('.ag-body-horizontal-scroll-viewport');
    }

    columnHeader(gridObj: Locator, columnName: string): Locator {
        return gridObj.locator('.ag-cell-label-container', {
            hasText: `${columnName}`,
        });
    }

    /**
     * Gets the Locator object for the grid cell at the specified row and column
     * @param gridObj - the grid object to interact with
     * @param rowIndex - the row that contains the cell, starting at 0
     * @param columnIndex - the column that contains the cell, starting at 1
     * @returns - the locator object for the grid cell
     */
    getGridCell(gridObj: Locator, rowIndex: number, columnIndex: number): Locator {
        return gridObj.locator(`[role=row][row-index='${rowIndex}'] [role=gridcell][aria-colindex='${columnIndex}']`);
    }

    /** Helper Functions */

    /**
     * This method scrolls to the right with mouse until the column name that is provided becomes visible.
     * Note: Regular Playwright scrollIntoViewIfNeeded method does not work for this case.
     * @param gridObj - the grid object to interact with
     * @param columnName - The name of the column.
     * The column name needs to be an exact match to the DOM value, which maybe different from visual representation on UI.
     * Example: 'Customer' in DOM vs 'CUSTOMER' on UI.
     * @returns - A promise that resolves when the scrolling is complete.
     */
    async horizontalScrollingUntilVisible(gridObj: Locator, columnName: string): Promise<void> {
        const columnHeader = this.columnHeader(gridObj, columnName);
        const boundingBox = await this.horizontalScrollBar(gridObj).boundingBox();
        const page = gridObj.page();
        if (boundingBox) {
            await expect(async () => {
                const startX = boundingBox.x + boundingBox.width / 2;
                const startY = boundingBox.y + boundingBox.height / 2;
                const endX = startX + 200; // Adjust the value as needed for the drag distance
                await page.mouse.move(startX, startY);
                await page.mouse.down();
                await page.mouse.move(endX, startY, { steps: 10 });
                await page.mouse.up();
                await columnHeader.waitFor({ state: 'visible', timeout: 3000 });
            }, 'Failed to find a column name match in the grid').toPass({
                timeout: 100 * 1000,
            });
        }
    }

    /**
     * Scrolls vertically until the end of the Ag grid is reached.
     * @param gridObj - The grid object.
     * @returns - A promise that resolves when scrolling is complete.
     */
    async scrollDownTillGridEnd(gridObj: Locator): Promise<void> {
        const page = gridObj.page();
        const maxIterations = 10; // Set a reasonable limit for iterations
        let iterationCount = 0;

        while (iterationCount < maxIterations) {
            const previousScrollPosition = await page.evaluate(() => {
                const viewport = document.querySelector<HTMLElement>('.ag-body-viewport');
                if (!viewport) {
                    throw new Error('The AG Grid body viewport was not found.');
                }
                const previousScrollTop = viewport.scrollTop;
                viewport.scrollTop += viewport.clientHeight;
                return previousScrollTop;
            });

            // Wait to allow the DOM to update
            await page.waitForLoadState('domcontentloaded');

            const currentScrollPosition = await page.evaluate(() => {
                const viewport = document.querySelector<HTMLElement>('.ag-body-viewport');
                if (!viewport) {
                    throw new Error('The AG Grid body viewport was not found.');
                }
                return viewport.scrollTop;
            });

            // Break the loop if the scroll position hasn't changed, indicating the bottom has been reached
            if (currentScrollPosition === previousScrollPosition) {
                break;
            }

            iterationCount++;
        }

        if (iterationCount >= maxIterations) {
            throw new Error('Reached maximum scroll iterations without reaching the end of the grid.');
        }
    }

    /**
     * Get the maximum "row-index" attribute value visible in DOM for a given Ag Grid.
     * @param gridObj - The grid object.
     * @returns max value for given Ag Grid "row-index" attribute visible in DOM.
     */
    async getMaxRowIndexForAgGrid(gridObj: Locator): Promise<number> {
        // Select all elements with role="row"
        const rows = await gridObj.locator('[role="row"]').all();

        // Extract the row-index attribute values and convert them to numbers
        const rowIndexes = await Promise.all(
            rows.map(async (row) => {
                const rowIndex = await row.getAttribute('row-index');
                return Number.parseInt(rowIndex ?? '', 10);
            }),
        );

        // Filter out any NaN values (in case some elements don't have a valid row-index)
        const validRowIndexes = rowIndexes.filter((index) => !Number.isNaN(index));

        // Find the maximum row-index value
        return Math.max(...validRowIndexes);
    }

    /**
     * This method presses the right arrow key until the column name that is provided becomes visible.
     * Note: Regular Playwright scrollIntoViewIfNeeded method does not work for this case.
     * @param gridObj - the grid object to interact with
     * @param columnName - The name of the column.
     * The column name needs to be an exact match to the DOM value, which maybe different from visual representation on UI.
     * Example: 'Customer' in DOM vs 'CUSTOMER' on UI.
     * @returns - A promise that resolves when the clicking is complete.
     * */
    async arrowRightPressUntilVisible(gridObj: Locator, columnName: string): Promise<void> {
        const columnHeader = this.columnHeader(gridObj, columnName);
        const page = gridObj.page();
        const firstHeader = gridObj.locator("div[role='columnheader'][aria-colindex='1']");
        await firstHeader.click();
        await expect(async () => {
            for (let i = 0; i < 5; i++) {
                await page.keyboard.press('ArrowRight');
            }
            await columnHeader.waitFor({ state: 'visible', timeout: 3000 });
        }, 'Failed to find a column name match in the grid').toPass({
            timeout: 100 * 1000,
        });
    }

    /**
     * Retrieves the column header cell locator based on the given column name. The method will handle a need to scroll to the right in the gid if needed.
     * If the scroll bar is visible it will utilize it for scrolling, otherwise it will use the keyboard to scroll to the right.
     * @param columnName - The name of the column.
     * The column name needs to be an exact match to the DOM value, which maybe different from visual representation on UI.
     * Example: 'Customer' in DOM vs 'CUSTOMER' on UI.
     * @param gridObj - the grid object to interact with
     * @returns - Returns the column header cell locator.
     */
    async getColumnHeaderCell(columnName: string, gridObj: Locator): Promise<Locator> {
        const columnHeader = this.columnHeader(gridObj, columnName);
        const columnNameFound = await columnHeader
            .waitFor({ state: 'visible', timeout: 3000 })
            .then(() => true)
            .catch(() => false);
        if (!columnNameFound) {
            if (await this.horizontalScrollBar(gridObj).isVisible()) {
                await this.horizontalScrollingUntilVisible(gridObj, columnName);
            } else {
                await this.arrowRightPressUntilVisible(gridObj, columnName);
            }
        }
        return columnHeader;
    }

    /**
     * Sorts the column in the table based on the given column name and sorting type.
     * @param columnName - The name of the column to be sorted.
     * The column name needs to be an exact match to the DOM value, which maybe different from visual representation on UI.
     * Example: 'Customer' in DOM vs 'CUSTOMER' on UI.
     * @param sortingType - The type of sorting to be applied. Valid values are 'Ascending' or 'Descending'.
     * @param gridObj - the grid object to interact with
     * @throws If an invalid sorting type is provided.
     */
    async sortColumn(columnName: string, sortingType: SortingType, gridObj: Locator): Promise<void> {
        const validSortingTypes: SortingType[] = ['Ascending', 'Descending'];
        const page = gridObj.page();
        if (!validSortingTypes.includes(sortingType)) {
            throw new Error(`Invalid item type: ${sortingType}. Valid item types are: ${validSortingTypes.join(', ')}`);
        }
        const columnHeader = await this.getColumnHeaderCell(columnName, gridObj);
        let desiredClassAttribute: string;
        if (sortingType === 'Ascending') {
            desiredClassAttribute = 'ag-cell-label-container ag-header-cell-sorted-asc';
        } else {
            desiredClassAttribute = 'ag-cell-label-container ag-header-cell-sorted-desc';
        }
        while ((await columnHeader.getAttribute('class')) !== desiredClassAttribute) {
            await columnHeader.click();
            await page.waitForLoadState('domcontentloaded');
        }
    }

    /**
     * Expand the grid to make more rows visible in the DOM (for now returns only 500 rows)
     * @param height - pixel height to set grid to, or accept default of 1500
     * @param gridObj - grid object locator
     */
    async expandGridHeight({ gridObj, height }: ExpandGridHeightOptions): Promise<void> {
        const page = gridObj.page();
        const defaultHeight = '1500px';
        const gridId = await gridObj.getAttribute('id');
        if (!gridId) {
            throw new Error('The grid element is missing an id attribute.');
        }
        const objValue = { id: gridId, h: height, defHeight: defaultHeight };
        if (height === undefined) {
            await page.evaluate(({ id, defHeight }) => {
                const grid = document.getElementById(id);
                if (!grid) {
                    throw new Error(`The grid with id "${id}" was not found.`);
                }
                grid.style.height = defHeight;
            }, objValue);
        } else {
            await page.evaluate(
                ({ id, h }: { id: string; h: string }) => {
                    const grid = document.getElementById(id);
                    if (!grid) {
                        throw new Error(`The grid with id "${id}" was not found.`);
                    }
                    grid.style.height = h;
                },
                { id: gridId, h: height },
            );
        }
    }

    /**
     * Clicks links dropdown and return values
     * @param gridObj - the grid object to interact with
     * @param rowIndex - the row that contains the cell, starting at 0
     * @param linksColumnIndex - Links column index
     * @returns list of values
     * @throws - Links cell does not exist on the page
     */
    async clickLinksDropdown(gridObj: Locator, rowIndex: number, linksColumnIndex: number): Promise<string[]> {
        await this.getGridCell(gridObj, rowIndex, linksColumnIndex).waitFor({
            state: 'visible',
        });
        const gridCellIsVisible = await this.getGridCell(gridObj, rowIndex, linksColumnIndex).isVisible();
        if (!gridCellIsVisible) {
            throw new Error(`Links cell does not exist on the page`);
        }
        await this.getGridCell(gridObj, rowIndex, linksColumnIndex).click();
        return this.getGridCell(gridObj, rowIndex, linksColumnIndex).allInnerTexts();
    }

    /**
     * Getting total number of rows from the grid
     * @param gridLocator - the grid object to interact with
     * @returns - Returns the number of rows
     */
    async getTotalRowCountFromTheAgGrid(gridLocator: Locator): Promise<number> {
        return gridLocator.locator('.ag-center-cols-container .ag-row').count();
    }

    /**
     * Clicks grid rows
     * NOTE: use expandGridHeight({ gridObj, height }) method before use this method because in default the page only able to select 16 rows.
     * above method will display the row upto 500 rows only
     * @param gridObj - the grid object to interact with
     * @param rowIndex - the row that contains the cell, starting at 0
     * @throws - index out of bounds
     */
    async selectRowFromGrid(gridObj: Locator, rowIndex: number): Promise<void> {
        const rowNum = gridObj.locator(`[role=row][row-index='${rowIndex}'] div>input`);
        if (!(await rowNum.isVisible())) {
            throw new Error(`Row index ${rowIndex} Out of bounds or exceeded the default view on the page`);
        }
        await rowNum.click();
    }
}

export const agGrid = new AgGrid();
