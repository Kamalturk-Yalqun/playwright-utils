import { mkdirSync } from 'node:fs';

/** Provides utility operations for creating temporary file paths. */
class FileHelper {
    /**
     * Generates a unique file path in the temporary resources directory.
     *
     * The directory is created when it does not already exist.
     *
     * @param fileExtension - File extension with or without a leading period.
     * @returns A unique path under `resources/tmp`.
     */
    generateFilePath(fileExtension: string): string {
        mkdirSync('resources/tmp', { recursive: true });
        const normalizedExtension = fileExtension.replace(/^\./, '');
        return `resources/tmp/tmp-${process.hrtime.bigint()}.${normalizedExtension}`;
    }
}

export const fileHelper = new FileHelper();
