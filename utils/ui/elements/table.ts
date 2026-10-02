import { expect, type Locator } from '@playwright/test';

/** Provides generic operations for interacting with HTML tables. */
export class Table {
    /** Returns all row locators in a table body. */
    async getTableRows(tableBody: Locator): Promise<Locator[]> {
        return tableBody.locator('tr').all();
    }

    /**
     * Returns a table row containing unique text.
     *
     * @param tableObj - Table locator.
     * @param rowName - Unique text identifying the row.
     */
    async getTableRowByName(tableObj: Locator, rowName: string): Promise<Locator> {
        const tableRow = tableObj.locator('tr').filter({ hasText: rowName });
        await expect(tableRow, `Row Name "${rowName}" does not exist in table!`).toHaveCount(1);
        return tableRow;
    }

    /** Returns a row by its one-based position in the table body. */
    async getTableRowByNumber(tableBody: Locator, rowNumber: number): Promise<Locator> {
        const tableRows = await this.getTableRows(tableBody);
        const row = tableRows[rowNumber - 1];
        if (!row) {
            throw new Error(`The row ${rowNumber} does not exist in the table!`);
        }
        return row;
    }

    /** Returns a cell using its column-header name and one-based row index. */
    async getColumnCellByHeaderNameAndRowIndex(tableObj: Locator, columnName: string, rowIndex: number): Promise<Locator> {
        const headerTexts = await tableObj.locator('thead tr th').allTextContents();
        const targetName = columnName.trim().toLowerCase();
        const columnIndex = headerTexts.findIndex((headerText) => headerText.trim().toLowerCase() === targetName) + 1;

        if (columnIndex === 0) {
            throw new Error(`Column Name "${columnName}" does not exist in table!`);
        }

        const rowLocator = await this.getTableRowByNumber(tableObj.locator('tbody'), rowIndex);
        return rowLocator.locator(`td:nth-child(${columnIndex})`);
    }

    /** Returns the one-based index of the first table-body row containing the supplied text. */
    async getTableRowIndexByText(tableObj: Locator, rowText: string): Promise<number> {
        const tableRows = await this.getTableRows(tableObj.locator('tbody'));

        for (const [index, row] of tableRows.entries()) {
            const currentRowText = await row.textContent();
            if (currentRowText?.includes(rowText)) {
                return index + 1;
            }
        }

        throw new Error(`Row with text "${rowText}" does not exist in table body!`);
    }
}
