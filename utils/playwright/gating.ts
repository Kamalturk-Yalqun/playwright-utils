import { promises as fs } from 'node:fs';
import { xml2js } from 'xml-js';
import { customLogger } from '../utilities/winston-logger';

interface XmlAttributes {
    name: string;
    value: string;
}

interface XmlProperty {
    _attributes: XmlAttributes;
}

interface XmlTestCase {
    properties?: {
        property: XmlProperty | XmlProperty[];
    };
    failure?: unknown;
}

interface XmlTestSuite {
    testcase: XmlTestCase | XmlTestCase[];
}

interface XmlTestResults {
    testsuites: {
        testsuite: XmlTestSuite | XmlTestSuite[];
    };
}

interface GatingRule {
    tags: string | string[];
    passRate: number;
}

type GatingCriteria = Record<string, Record<string, GatingRule>>;

interface FilteredGatingCriteria {
    matchingEnv: string;
    matchingSuite: string;
    gatingCriteria: GatingCriteria;
}

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Reads the XML file and returns the data as a string.
 *
 * @param xmlFilePath - Path to the XML report.
 * @returns The XML file contents.
 */
async function readXmlFile(xmlFilePath: string): Promise<string> {
    try {
        return await fs.readFile(xmlFilePath, 'utf8');
    } catch (error) {
        throw new Error(`Error reading XML file: ${errorMessage(error)}`);
    }
}

/**
 * Parses the XML data using xml-js.
 *
 * @param data - XML report contents.
 * @returns The parsed compact XML report.
 */
function parseXmlData(data: string): XmlTestResults {
    return xml2js(data, { compact: true }) as unknown as XmlTestResults;
}

/**
 * Filters the test cases based on the required tags.
 *
 * @param testCases - Test cases to filter.
 * @param requiredTags - Tags for which at least one must occur on a test case.
 * @returns Test cases matching at least one required tag.
 * @throws Error when the test case data cannot be filtered.
 */
function filterTestCasesByTags(testCases: XmlTestCase[], requiredTags: string[]): XmlTestCase[] {
    try {
        return testCases.filter((testcase) => {
            const property = testcase.properties?.property ?? [];
            const properties = Array.isArray(property) ? property : [property];
            const tagsProperty = properties.find((prop) => prop._attributes.name === 'TAGS');
            // If no test cases match the required tags, this will return an empty array.
            const tags = tagsProperty ? tagsProperty._attributes.value.split(',') : [];
            return requiredTags.some((tag) => tags.includes(tag));
        });
    } catch (error) {
        throw new Error(`Error filtering test cases by tags: ${errorMessage(error)}`);
    }
}

/**
 * Calculates the pass rate based on the filtered test cases.
 *
 * @param testCases - Filtered test cases.
 * @returns The rounded pass rate percentage.
 */
function calculatePassRate(testCases: XmlTestCase[]): number {
    const totalTests = testCases.length;
    const totalFailures = testCases.filter((testcase) => testcase.failure).length;

    return Math.round(((totalTests - totalFailures) / totalTests) * 100);
}

/**
 * Calculates the actual pass rate from the execution results based on the required tags.
 *
 * @param xmlFilePath - Path to the XML report.
 * @param requiredTags - Optional tags used to filter test cases.
 * @returns The rounded pass rate percentage.
 * @throws Error when the report cannot be read, parsed, or contains no matching tests.
 */
export async function getActualPassRateFromExecution(xmlFilePath: string, requiredTags: string[] = []): Promise<number> {
    try {
        const data = await readXmlFile(xmlFilePath);
        const result = parseXmlData(data);
        const parsedSuites = result.testsuites.testsuite;
        const testsuites = Array.isArray(parsedSuites) ? parsedSuites : [parsedSuites];
        let testCases: XmlTestCase[] = [];

        // Extracts all test cases from the test suites.
        testsuites.forEach((suite) => {
            const suiteTestCases = Array.isArray(suite.testcase) ? suite.testcase : [suite.testcase];
            testCases = testCases.concat(suiteTestCases);
        });

        // Filter test cases based on required tags, if any
        const filteredTestCases = requiredTags.length === 0 ? testCases : filterTestCasesByTags(testCases, requiredTags);
        // Calculate and return the pass rate
        if (filteredTestCases.length === 0) {
            throw new Error('No test cases found for calculating pass rate');
        }
        return calculatePassRate(filteredTestCases);
    } catch (error) {
        throw new Error(`Error processing XML report: ${errorMessage(error)}`);
    }
}

/**
 * Reads and filters the gating criteria from a JSON file based on the provided test environment and test suite.
 *
 * @param jsonFilePath - Path to the JSON gating configuration.
 * @param testEnv - Test environment to locate.
 * @param testSuite - Test suite to locate.
 * @returns The matched keys and parsed gating criteria.
 * @throws Error when the file is invalid or the requested environment or suite does not exist.
 */
async function readAndFilterGatingCriteria(jsonFilePath: string, testEnv: string, testSuite: string): Promise<FilteredGatingCriteria> {
    try {
        const jsonData = await fs.readFile(jsonFilePath, 'utf8');
        const gatingCriteria = JSON.parse(jsonData) as GatingCriteria;

        // Convert testEnv and testSuite to lowercase for case-insensitive comparison
        const lowerCaseTestEnv = testEnv.toLowerCase();
        const lowerCaseTestSuite = testSuite.toLowerCase();

        // Find the matching environment and suite in a case-insensitive manner
        const matchingEnv = Object.keys(gatingCriteria).find((env) => env.toLowerCase() === lowerCaseTestEnv);
        if (!matchingEnv) {
            throw new Error(`Error while searching for test env "${testEnv}" in JSON file with the gating criteria.`);
        }
        const matchingSuite = Object.keys(gatingCriteria[matchingEnv]).find((suite) => suite.toLowerCase() === lowerCaseTestSuite);
        if (!matchingSuite) {
            throw new Error(`Error while searching for test suite "${testSuite}" in JSON file with the gating criteria.`);
        }

        return { matchingEnv, matchingSuite, gatingCriteria };
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Error parsing JSON data: ${error.message}`);
        }
        throw new Error(`Error reading or processing JSON file: ${errorMessage(error)}`);
    }
}

/**
 * Checks the gating criteria for a given test environment and test suite.
 *
 * @param jsonFilePath - Path to the JSON gating configuration.
 * @param testEnv - Test environment to evaluate.
 * @param testSuite - Test suite to evaluate.
 * @param xmlReportPath - Path to the XML execution report.
 * @returns Whether the actual pass rate meets the configured pass rate.
 * @throws Error when the gating criteria cannot be evaluated.
 */
export async function checkGating(jsonFilePath: string, testEnv: string, testSuite: string, xmlReportPath: string): Promise<boolean> {
    try {
        const { matchingEnv, matchingSuite, gatingCriteria } = await readAndFilterGatingCriteria(jsonFilePath, testEnv, testSuite);
        // Get the required tags and pass rate
        let { tags, passRate } = gatingCriteria[matchingEnv][matchingSuite];
        // Ensure tags is an array
        if (!Array.isArray(tags)) {
            tags = [tags];
        }
        // Ensure each tag has an '@' sign upfront
        tags = tags.map((tag) => (tag.startsWith('@') ? tag : `@${tag}`));
        // Call getActualPassRateFromExecution to get the actual pass rate
        const actualPassRate = await getActualPassRateFromExecution(xmlReportPath, tags);

        customLogger.info(`Actual pass rate for suite "${testSuite}" and environment "${testEnv}": ${actualPassRate}%`);
        customLogger.info(`Required pass rate: ${passRate}%`);

        // Check if the actual pass rate meets the required pass rate
        if (actualPassRate >= passRate) {
            customLogger.info('Gating criteria met.');
            return true;
        } else {
            customLogger.info('Gating criteria not met.');
            return false;
        }
    } catch (error) {
        const stack = error instanceof Error ? error.stack : undefined;
        throw new Error(`Error checking gating:${errorMessage(error)}, ${stack}`);
    }
}
