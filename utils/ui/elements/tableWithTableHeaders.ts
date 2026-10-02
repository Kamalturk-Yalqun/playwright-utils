import type { Locator } from '@playwright/test';
import { Table } from './table';

/** Provides operations for tables with a distinct header row. */
export class TableWithTableHeaders extends Table {
    /**
     * Returns the one-based index of a column header.
     *
     * @param columnHeadersObjList - Column-header locators.
     * @param columnName - Header text to locate.
     */
    async getColumnIndex(columnHeadersObjList: Locator[], columnName: string): Promise<number> {
        for (const [index, column] of columnHeadersObjList.entries()) {
            if ((await column.textContent()) === columnName) {
                return index + 1;
            }
        }

        throw new Error(`Column Name "${columnName}" does not exist in table!`);
    }

    /** Returns a table cell identified by row and column. */
    async getTableCell(tableObj: Locator, columnHeadersObjList: Locator[], rowIdentifier: string | Locator, columnName: string): Promise<Locator> {
        const tableRow = typeof rowIdentifier === 'string' ? await this.getTableRowByName(tableObj, rowIdentifier) : rowIdentifier;
        const columnIndex = await this.getColumnIndex(columnHeadersObjList, columnName);
        return tableRow.locator(`td:nth-child(${columnIndex})`);
    }

    /**
     * Opens a table cell by clicking a visible link within it or double-clicking the cell itself.
     */
    async clickOrDblClickOnTableCell(
        tableObj: Locator,
        tableBody: Locator,
        rowIndex: number,
        columnName: string,
        columnHeadersObjList: Locator[],
        rowName: string | null = null,
    ): Promise<void> {
        const rowLocator = rowName ? await this.getTableRowByName(tableObj, rowName) : await this.getTableRowByNumber(tableBody, rowIndex);
        const cell = await this.getTableCell(tableObj, columnHeadersObjList, rowLocator, columnName);
        const link = cell.locator('a');

        if (await link.isVisible()) {
            await link.click({ force: true });
        } else {
            await cell.dblclick({ force: true });
        }
    }
}

export const tableWithTableHeaders = new TableWithTableHeaders();
