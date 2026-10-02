import { mergeExpects, mergeTests, type Expect } from '@playwright/test';
import { expect as autoExpect, test as autoTest } from './custom-auto-fixture';
import { expect as postmanExpect, test as postmanTest } from './postman-fixture';

const test = mergeTests(postmanTest, autoTest);
const expect: Expect = mergeExpects(postmanExpect, autoExpect);

export { expect, test };
