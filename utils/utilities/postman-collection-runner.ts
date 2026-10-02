import { exec, spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { awsSecretsManager } from '../aws';

/** Options used to execute a Postman collection through the Postman CLI. */
export interface RunPostmanCollectionOptions {
    /**
     * UID of the collection to run. It is available in Postman under
     * **Collection > Info**.
     */
    collectionUid: string;
    /**
     * Optional environment UID, available under **Environment > Info**. When
     * omitted, the collection runs without environment variables.
     */
    envUid?: string | null;
    /**
     * Optional request or folder name. Supplying a folder runs all requests
     * contained in that folder.
     */
    queryName?: string | null;
    /** Optional path to CSV or JSON iteration data for parameterized tests. */
    iterationDataPath?: string | null;
    /**
     * Optional API key that overrides the key configured in AWS Secrets Manager.
     */
    apiKey?: string | null;
}

/**
 * Executes Postman collections, folders, and requests through the Postman CLI.
 * A collection run fails when its requests, pre-request scripts, test scripts,
 * or assertions fail.
 */
class PostmanCollectionRunner {
    /**
     * Retrieves the configured Postman API key from AWS Secrets Manager.
     *
     * @returns The Postman API key.
     * @throws Error when the runner cannot retrieve or initialize the API key.
     */
    async getApiKey(): Promise<string> {
        try {
            return await awsSecretsManager.getSecretFromAws(process.env.SECRET_ROLE_ARN!, `${process.env.AWS_ENV}/qeautomationengine/postman-api/api-key`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Unable to initialize PostmanCliRunner, ${message}.`);
        }
    }

    /**
     * Logs in to Postman using a supplied API key or the key retrieved from AWS
     * Secrets Manager when no key is provided.
     *
     * @param apiKey - Optional Postman API key. Defaults to `null`.
     * @returns A promise that resolves after a successful login.
     * @throws Error when the Postman CLI login fails.
     */
    async loginPostman(apiKey: string | null = null): Promise<void> {
        const resolvedApiKey = apiKey || (await this.getApiKey());
        return new Promise<void>((resolve, reject) => {
            exec(`postman login --with-api-key ${resolvedApiKey}`, (error) => {
                if (error) {
                    reject(new Error(`Postman login failed! ${error}`));
                    return;
                }
                resolve();
            });
        });
    }

    /**
     * Runs a Postman collection, optionally narrowed to a request or folder,
     * and stores the CLI output as a JSON report under `reports/postman-cli`.
     *
     * When no environment UID is supplied, the collection runs without
     * environment variables. Requests inheriting authentication from a parent
     * collection can therefore fail when required values are unavailable.
     * Postman CLI can automatically perform authentication only with variables
     * available at environment, global, or collection scope.
     *
     * A CSV or JSON iteration-data file can be supplied for parameterized runs.
     * On completion, the extracted Postman run URL is assigned to
     * `process.env.POSTMAN_TESTRUN_URL` so it can be included in test annotations.
     *
     * @param options - Collection UID and optional environment, request or
     * folder, iteration-data path, and API-key settings.
     * @returns A promise that resolves after a successful collection run and
     * report write.
     * @throws Error with `Collection run failed!` when the Postman CLI exits with
     * a nonzero status code.
     */
    async runPostmanCollection({
        collectionUid,
        envUid = null,
        queryName = null,
        iterationDataPath = null,
        apiKey = null,
    }: RunPostmanCollectionOptions): Promise<void> {
        const query = queryName || collectionUid;
        const reportDir = './reports/postman-cli';
        const reportPath = join(reportDir, `postman-cli-${query}.json`);
        mkdirSync(reportDir, { recursive: true });
        await this.loginPostman(apiKey);

        return new Promise<void>((resolve, reject) => {
            const cliCommandArgs = this.constructCliCommandArgs(collectionUid, envUid, queryName, iterationDataPath);
            const postmanProcess = spawn('postman', cliCommandArgs);
            const outputData: string[] = [];
            let postmanRunUrl: string | null = null;

            postmanProcess.stdout.on('data', (data: Buffer | string) => {
                const dataStr = data.toString();
                outputData.push(dataStr);
                postmanRunUrl = this.extractUrl(dataStr);
            });
            postmanProcess.stderr.on('data', (data: Buffer | string) => {
                outputData.push(data.toString());
            });
            postmanProcess.on('close', (code) => {
                process.env.POSTMAN_TESTRUN_URL = String(postmanRunUrl);
                writeFileSync(reportPath, JSON.stringify(outputData, null, 2));
                if (code !== 0) {
                    reject(new Error('Collection run failed!'));
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Constructs the command-line arguments for a Postman collection run.
     * The generated arguments always include `--insecure`.
     *
     * @param collectionUid - UID of the Postman collection to run.
     * @param envUid - Optional Postman environment UID added with `--environment`.
     * @param queryName - Optional request or folder name added with `-i`.
     * @param iterationDataPath - Optional CSV or JSON data path added with
     * `--iteration-data`.
     * @returns The ordered Postman CLI arguments.
     */
    constructCliCommandArgs(collectionUid: string, envUid?: string | null, queryName?: string | null, iterationDataPath?: string | null): string[] {
        const cliCommandArgs = ['collection', 'run', collectionUid];
        if (envUid) {
            cliCommandArgs.push('--environment', envUid);
        }
        if (queryName) {
            cliCommandArgs.push('-i', queryName);
        }
        if (iterationDataPath) {
            cliCommandArgs.push('--iteration-data', iterationDataPath);
        }
        cliCommandArgs.push('--insecure');
        return cliCommandArgs;
    }

    /**
     * Extracts the last Postman run URL from a CLI output string.
     *
     * @param dataStr - Postman CLI output to search.
     * @returns The last matching Postman workspace run URL, or `null` when no URL
     * is found.
     */
    extractUrl(dataStr: string): string | null {
        let postmanRunUrl: string | null = null;
        const urlRegex = /https:\/\/go\.postman\.co\/workspace\/[^/]*\/run\/[^/]*/g;
        let match: RegExpExecArray | null;
        while ((match = urlRegex.exec(dataStr)) !== null) {
            postmanRunUrl = match[0];
        }
        return postmanRunUrl;
    }
}

export const postmanCollectionRunner = new PostmanCollectionRunner();
