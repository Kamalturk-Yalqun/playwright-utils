import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { js2xml, xml2js } from 'xml-js';

interface XmlAttributes {
    name?: string;
    value?: string;
    testEntityKey?: string;
    [key: string]: string | undefined;
}

interface XmlProperty {
    _attributes: XmlAttributes;
}

interface XmlTestCase {
    _attributes: XmlAttributes;
    properties?: {
        property: XmlProperty[];
    };
}

interface XmlTestSuite {
    testcase: XmlTestCase[];
}

interface PlaywrightReport {
    testsuites: {
        testsuite?: XmlTestSuite[];
    };
    [key: string]: unknown;
}

/**
 * Converts a Playwright JUnit report into the format required by QMetry.
 */
class QmetryReport {
    readonly QMETRY_REPORT_PATH = './reports/playwright';

    /**
     * Extracts QMetry test case IDs from Playwright JUnit properties and adds
     * each ID to its test case node in a new XML report.
     *
     * @param reportPath - Path to the Playwright JUnit report, relative to the test project root.
     */
    createQmetryReport(reportPath: string): void {
        const optionsToJson = { compact: true, alwaysArray: ['testsuite', 'testcase', 'property'] };

        // Read the Playwright XML report and convert it to an object.
        const reportContents = readFileSync(reportPath, 'utf8');
        const reportObj = xml2js(reportContents, optionsToJson) as unknown as PlaywrightReport;

        const suites = reportObj.testsuites.testsuite;

        // If there are no suites, exit without generating the QMetry report.
        if (!suites) {
            return;
        }

        // Add each QMetry ID from the test properties to its test case attributes.
        for (const suite of suites) {
            const tests = suite.testcase;

            for (const test of tests) {
                const id = this.getQmetryId(test);
                if (id) {
                    test._attributes.testEntityKey = id;
                }
            }
        }

        this.createXmlReport(reportObj);
    }

    /**
     * Finds the `testEntityKey` property on a test case.
     *
     * @param test - Test case node from the compact XML representation.
     * @returns The QMetry test case ID, or `undefined` when it is not present.
     */
    getQmetryId(test: XmlTestCase): string | undefined {
        const properties = test.properties?.property ?? [];

        for (const property of properties) {
            if (property._attributes.name === 'testEntityKey') {
                return property._attributes.value;
            }
        }

        return undefined;
    }

    /**
     * Converts the report object to XML and writes it to the reports directory.
     *
     * @param reportObj - Report represented in the compact `xml-js` object format.
     */
    createXmlReport(reportObj: PlaywrightReport): void {
        const optionsToXml = {
            compact: true,
            attributeValueFn(value: string): string {
                return value.replaceAll('&', '&amp;');
            },
        };
        const newReport = js2xml(reportObj, optionsToXml);
        const reportName = 'qmt-results.xml';

        if (!existsSync(this.QMETRY_REPORT_PATH)) {
            mkdirSync(this.QMETRY_REPORT_PATH, { recursive: true });
        }
        writeFileSync(`${this.QMETRY_REPORT_PATH}/${reportName}`, newReport);
    }
}

export const qmetryReport = new QmetryReport();
