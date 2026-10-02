import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { CellObject, Range, WorkBook, WorkSheet } from 'xlsx';
import * as xlsx from 'xlsx';
import { fileHelper } from './file-helpers';

type ExcelCellValue = CellObject['v'];

const errorDetails = (error: unknown): string => {
    if (error instanceof Error) {
        return `${error.message}, ${(error as Error & { stacktrace?: string }).stacktrace}`;
    }
    return String(error);
};

/**
 * Provides helper operations for reading, searching, editing, and saving Excel
 * workbooks and worksheets.
 */
class ExcelHelper {
    /**
     * Searches a workbook for a case-sensitive worksheet name.
     *
     * @param workbook - Workbook whose sheet names should be searched.
     * @param sheetName - Worksheet name to locate.
     * @returns The zero-based worksheet index, or `-1` when no sheet matches.
     */
    getSheetIndexBySheetName(workbook: WorkBook, sheetName: string): number {
        return workbook.SheetNames.findIndex((name) => name === sheetName);
    }

    /**
     * Gets the worksheet's header row.
     *
     * @param worksheet - Worksheet from which to read the first row.
     * @returns The formatted header values in column order. A value can be
     * `undefined` when a header cell has no formatted text.
     */
    getHeadersRow(worksheet: WorkSheet): Array<string | undefined> {
        const range = xlsx.utils.decode_range(worksheet['!ref']!);
        const row: Array<string | undefined> = [];
        for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
            row.push(worksheet[xlsx.utils.encode_cell({ r: 0, c: colNum })].w);
        }
        return row;
    }

    /**
     * Gets the cell object at zero-based row and column indexes.
     *
     * The returned SheetJS cell can expose the following metadata:
     * - `v`: raw value, such as a number, string, date, or boolean
     * - `w`: formatted text
     * - `t`: cell type (`b`, `e`, `n`, `d`, `s`, or `z`)
     * - `c`: cell comments
     * - `s`: style or theme
     * - `h`: HTML rendering of rich text
     * - `l`: hyperlink and tooltip information
     * - `D`: whether an array formula is dynamic
     * - `F`: array-formula range
     * - `f`: formula encoded as an A1-style string
     * - `z`: associated number-format string
     *
     * @param worksheet - Worksheet containing the cell.
     * @param rowIndex - Zero-based row index.
     * @param columnIndex - Zero-based column index.
     * @returns The SheetJS cell object, or `undefined` when the cell does not exist.
     */
    getCellObjectByIndexes(worksheet: WorkSheet, rowIndex: number, columnIndex: number): CellObject | undefined {
        return worksheet[xlsx.utils.encode_cell({ r: rowIndex, c: columnIndex })] as CellObject | undefined;
    }

    /**
     * Searches the worksheet row by row for a cell value.
     *
     * @param worksheet - Worksheet to search.
     * @param cellValue - Raw cell value to locate.
     * @returns The raw values from the first row containing the value, or `null`
     * when no row matches.
     */
    getFirstRowByCellValue(worksheet: WorkSheet, cellValue: ExcelCellValue): ExcelCellValue[] | null {
        const range = xlsx.utils.decode_range(worksheet['!ref']!);
        for (let rowNum = range.s.r; rowNum <= range.e.r; rowNum++) {
            const row: ExcelCellValue[] = [];
            for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
                row.push((worksheet[xlsx.utils.encode_cell({ r: rowNum, c: colNum })] as CellObject).v);
            }
            if (row.includes(cellValue)) {
                return row;
            }
        }
        return null;
    }

    /**
     * Uses `getHeadersRow()` to find a column by its header name.
     *
     * @param worksheet - Worksheet whose headers should be searched.
     * @param columnName - Header name to locate.
     * @returns The zero-based column index, or `-1` when no header matches.
     */
    getColumnIndexByColumnName(worksheet: WorkSheet, columnName: string): number {
        return this.getHeadersRow(worksheet).findIndex((header) => header === columnName);
    }

    /**
     * Gets a cell's raw value from zero-based row and column indexes.
     *
     * @param worksheet - Worksheet containing the cell.
     * @param rowIndex - Zero-based row index.
     * @param columnIndex - Zero-based column index.
     * @returns The raw cell value, `undefined` when the cell exists without a
     * raw value, or `null` when the cell does not exist.
     */
    getCellValueByRowAndColumnIndex(worksheet: WorkSheet, rowIndex: number, columnIndex: number): ExcelCellValue | null | undefined {
        const cellValue = this.getCellObjectByIndexes(worksheet, rowIndex, columnIndex);
        return cellValue === undefined ? null : cellValue.v;
    }

    /**
     * Finds the first worksheet row whose named column contains a specified value.
     *
     * @param worksheet - Worksheet to search.
     * @param columnName - Header name identifying the column to search.
     * @param cellValue - Raw cell value to match.
     * @returns The matching row represented as a JSON object, `null` when no
     * value matches, or `undefined` when a matching worksheet row does not map
     * to a data row in the generated JSON.
     */
    getFirstRowByCellValueAndColumnName(worksheet: WorkSheet, columnName: string, cellValue: ExcelCellValue): Record<string, unknown> | null | undefined {
        const range = this.getSheetRange(worksheet);
        for (let rowNum = range.s.r; rowNum <= range.e.r; rowNum++) {
            const columnIndex = this.getColumnIndexByColumnName(worksheet, columnName);
            if (columnIndex !== -1) {
                const cell = worksheet[xlsx.utils.encode_cell({ r: rowNum, c: columnIndex })] as CellObject;
                if (cell.v === cellValue) {
                    return xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet)[rowNum - 1];
                }
            }
        }
        return null;
    }

    /**
     * Reads an Excel workbook from disk.
     *
     * @param filepath - Path to the Excel file.
     * @returns The parsed workbook object.
     * @throws Error when the file cannot be read.
     */
    getWorkbook(filepath: string): WorkBook {
        try {
            return xlsx.readFile(filepath);
        } catch (error) {
            throw new Error(`The file could not be read due to ${errorDetails(error)}`);
        }
    }

    /**
     * Gets a worksheet by zero-based index or case-insensitive name.
     *
     * @param workbook - Workbook containing the requested worksheet.
     * @param sheetId - Worksheet name or zero-based worksheet index.
     * @returns The matching worksheet.
     * @throws Error when `sheetId` is not a string or number.
     * @throws Error when an empty name or nonexistent index identifies no sheet.
     * @throws Error when no worksheet name matches the supplied name.
     */
    getWorkSheetFromWorkBook(workbook: WorkBook, sheetId: string | number): WorkSheet {
        let sheetName: string | undefined;
        if (typeof sheetId === 'string') {
            sheetName = sheetId;
        } else if (typeof sheetId === 'number') {
            sheetName = workbook.SheetNames[sheetId];
        } else {
            throw new Error('Parameter type is not valid');
        }

        if (!sheetName) {
            throw new Error('No worksheet found');
        }
        const matchedName = workbook.SheetNames.find((sheet) => sheet.toLowerCase() === sheetName!.toLowerCase());
        if (!matchedName) {
            throw new Error('Worksheet name is not matching');
        }
        return workbook.Sheets[matchedName];
    }

    /**
     * Updates every data row, excluding the header row, in a named column and
     * saves the workbook through `saveChanges()`.
     *
     * When `filePath` is omitted, the workbook is saved to a generated temporary
     * path. Otherwise, it is saved to the supplied location.
     *
     * @param workbook - Workbook to update and save.
     * @param worksheet - Worksheet containing the column to update.
     * @param columnName - Header name of the column to update.
     * @param value - Raw value to assign to every data row in the column.
     * @param filePath - Optional destination path for the updated workbook.
     * @returns The path to the saved workbook.
     * @throws Error when the named column does not exist.
     */
    updateAllRowsForColumnName(workbook: WorkBook, worksheet: WorkSheet, columnName: string, value: ExcelCellValue, filePath?: string): string {
        const range = this.getSheetRange(worksheet);
        const colIndex = this.getColumnIndexByColumnName(worksheet, columnName);
        if (colIndex === -1) {
            throw new Error(`Column ${columnName} does not exist`);
        }

        for (let rowIndex = range.s.r + 1; rowIndex <= range.e.r; rowIndex++) {
            xlsx.utils.sheet_add_aoa(worksheet, [[value]], { origin: { c: colIndex, r: rowIndex } });
        }
        return this.saveChanges(workbook, filePath);
    }

    /**
     * Saves a workbook to the supplied path or to a temporary path generated by
     * `fileHelper.generateFilePath()` when no path is provided.
     *
     * @param workbook - Workbook containing the changes to save.
     * @param filePath - Optional destination path.
     * @returns The path to the saved workbook.
     * @throws Error when the workbook cannot be saved.
     */
    saveChanges(workbook: WorkBook, filePath?: string): string {
        const destination = filePath || fileHelper.generateFilePath('xlsx');
        try {
            mkdirSync(dirname(destination), { recursive: true });
            xlsx.writeFileXLSX(workbook, destination);
        } catch (error) {
            throw new Error(`The work sheet could not be saved due to ${errorDetails(error)}`);
        }
        return destination;
    }

    /**
     * Gets the decoded used range of a worksheet.
     *
     * @param worksheet - Worksheet whose range should be decoded.
     * @returns The range containing the start and end rows and columns.
     */
    getSheetRange(worksheet: WorkSheet): Range {
        return xlsx.utils.decode_range(worksheet['!ref']!);
    }

    /**
     * Gets a cell value by zero-based row index and column name.
     *
     * @param worksheet - Worksheet containing the cell.
     * @param rowIndex - Zero-based row index.
     * @param columnName - Header name identifying the column.
     * @returns `undefined` when the column is not found, `null` when the cell is
     * missing or empty, or the cell's raw value otherwise.
     */
    getCellValueByRowIndexAndColumnName(worksheet: WorkSheet, rowIndex: number, columnName: string): ExcelCellValue | null | undefined {
        const columnIndex = this.getColumnIndexByColumnName(worksheet, columnName);
        if (columnIndex === -1) {
            return undefined;
        }
        const cellValue = this.getCellValueByRowAndColumnIndex(worksheet, rowIndex, columnIndex);
        return cellValue !== null && cellValue !== undefined && cellValue !== '' ? cellValue : null;
    }

    /**
     * Updates a cell by zero-based row and column indexes and saves the workbook.
     * When `filePath` is omitted, the workbook is saved to a generated temporary
     * path.
     *
     * @param workbook - Workbook to update and save.
     * @param worksheet - Worksheet containing the cell.
     * @param rowIndex - Zero-based row index.
     * @param columnIndex - Zero-based column index.
     * @param value - Raw value to assign to the cell.
     * @param filePath - Optional destination path for the updated workbook.
     * @returns The path to the saved workbook.
     */
    editCellByRowNumberAndColumnNumber(
        workbook: WorkBook,
        worksheet: WorkSheet,
        rowIndex: number,
        columnIndex: number,
        value: ExcelCellValue,
        filePath?: string,
    ): string {
        xlsx.utils.sheet_add_aoa(worksheet, [[value]], { origin: { c: columnIndex, r: rowIndex } });
        return this.saveChanges(workbook, filePath);
    }

    /**
     * Updates a cell by zero-based row index and column name and saves the
     * workbook. When `filePath` is omitted, the workbook is saved to a generated
     * temporary path.
     *
     * @param workbook - Workbook to update and save.
     * @param worksheet - Worksheet containing the cell.
     * @param rowIndex - Zero-based row index.
     * @param columnName - Header name identifying the column.
     * @param value - Raw value to assign to the cell.
     * @param filePath - Optional destination path for the updated workbook.
     * @returns The path to the saved workbook.
     * @throws Error when the named column does not exist.
     */
    editCellByRowNumberAndColumnName(
        workbook: WorkBook,
        worksheet: WorkSheet,
        rowIndex: number,
        columnName: string,
        value: ExcelCellValue,
        filePath?: string,
    ): string {
        const columnIndex = this.getColumnIndexByColumnName(worksheet, columnName);
        if (columnIndex === -1) {
            throw new Error(`Column ${columnName} does not exist`);
        }
        return this.editCellByRowNumberAndColumnNumber(workbook, worksheet, rowIndex, columnIndex, value, filePath);
    }
}

export const excelHelper = new ExcelHelper();
