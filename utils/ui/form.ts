import type { Page } from '@playwright/test';
import { BasePage } from './base-page';

export type FormFieldValue = string | number | boolean;

export interface FormField {
    type: string;
    label: string;
    value?: FormFieldValue;
}

export interface FormScenario {
    name: string;
    properties: FormField[];
}

export interface FormScenarioData {
    formData?: FormScenario[];
}

const errorDetails = (error: unknown): string => {
    if (error instanceof Error) {
        return `${error.message}, ${error.stack}`;
    }
    return String(error);
};

/** Provides operations for populating and reading labeled form fields. */
export class Form extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    /**
     * Populates a form with the supplied fields.
     *
     * @param fields - Fields to populate.
     * @throws Error when a field cannot be populated.
     */
    async populateForm(fields: FormField[]): Promise<void> {
        let field: FormField | undefined;
        try {
            for (field of fields) {
                await this.setField(field.type, field.label, field.value ?? '');
            }
        } catch (error) {
            throw new Error(`Unable to set field ${field?.label ?? 'unknown'}: ${errorDetails(error)}`);
        }
    }

    /**
     * Populates a form using the fields associated with a named scenario.
     *
     * @param data - Form scenario data.
     * @param scenarioName - Scenario to populate.
     * @returns The fields belonging to the selected scenario.
     * @throws Error when the data is invalid or the scenario does not exist.
     */
    async populateFormFromScenario(data: FormScenarioData, scenarioName: string): Promise<FormField[]> {
        const scenarios = data.formData;
        if (!scenarios) {
            throw new Error('Invalid json, the formData key is missing');
        }

        const scenarioData = scenarios.find((scenario) => scenario.name === scenarioName);
        if (!scenarioData) {
            throw new Error(`The scenario "${scenarioName}" was not found.`);
        }

        await this.populateForm(scenarioData.properties);
        return scenarioData.properties;
    }

    /**
     * Reads the values of the supplied form fields.
     *
     * @param fields - Fields to read.
     * @returns Fields with their current values.
     */
    async getFormValues(fields: FormField[]): Promise<FormField[]> {
        const results: FormField[] = [];
        for (const field of fields) {
            try {
                const fieldValue = await this.getFieldValue(field.type, field.label);
                results.push({ type: field.type, label: field.label, value: fieldValue });
            } catch (error) {
                throw new Error(`Unable to get field ${field.label}: ${errorDetails(error)}`);
            }
        }
        return results;
    }

    /** Sets a supported form field value. */
    async setField(fieldType: string, label: string, value: FormFieldValue): Promise<void> {
        switch (fieldType.toLowerCase()) {
            case 'money':
            case 'date':
            case 'text':
            case 'select':
                await this.setTextField(label, String(value));
                break;
            default:
                throw new Error(`${fieldType} is not a supported field type`);
        }
    }

    /** Returns the value of a supported form field. */
    async getFieldValue(fieldType: string, label: string): Promise<string> {
        switch (fieldType.toLowerCase()) {
            case 'text':
            case 'money':
            case 'date':
            case 'select':
                return this.getInputFieldValue(label);
            default:
                throw new Error(`${fieldType} is not a supported field type`);
        }
    }

    /** Sets a labeled text field. */
    async setTextField(label: string, value: string): Promise<void> {
        try {
            const field = this.page.getByLabel(label, { exact: true });
            await field.clear();
            await field.fill(value);
        } catch (error) {
            throw new Error(`Unable to set field ${label}: ${errorDetails(error)}`);
        }
    }

    /** Returns the value of a labeled input field. */
    async getInputFieldValue(label: string): Promise<string> {
        try {
            return await this.page.getByLabel(label, { exact: true }).inputValue();
        } catch (error) {
            throw new Error(`Unable to get field ${label}: ${errorDetails(error)}`);
        }
    }

    /** Selects a value in a labeled select field. */
    async setSelectField(label: string, value: string): Promise<void> {
        try {
            await this.page.getByLabel(label, { exact: true }).selectOption(value);
        } catch (error) {
            throw new Error(`Unable to set field ${label}: ${errorDetails(error)}`);
        }
    }
}
