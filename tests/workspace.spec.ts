import { test, expect, type Page } from '@playwright/test';
import { mkdtempSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MAX_DOCUMENT_BYTES, validateDocument } from '../apps/web/lib/documents';
import { changeTestStatus, recordTestRun, type TestCase } from '../apps/web/lib/test-cases';

let fixtures: string;
test.beforeAll(() => {
  fixtures = mkdtempSync(join(tmpdir(), 'pf360-upload-test-'));
  for (const [name, size] of [['exact-50mb.pdf', MAX_DOCUMENT_BYTES], ['too-large.pdf', MAX_DOCUMENT_BYTES + 1]] as const) {
    const content = Buffer.alloc(size, 32);
    content.write('%PDF-1.7\n');
    content.write('\n%%EOF', size - 6);
    writeFileSync(join(fixtures, name), content);
  }
});
test.afterAll(() => { if (fixtures) rmSync(fixtures, { recursive: true, force: true }); });

async function openWorkspace(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Login to ProductFlow 360' })).toBeVisible();
  await page.getByLabel('Email').fill('admin@ptcl.com');
  await page.locator('input[name="password"]').fill('PTCLAdmin!2026');
  await page.getByLabel('Show Password').click();
  await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'text');
  await expect(page.locator('input[name="password"]')).toHaveValue('PTCLAdmin!2026');
  await page.getByLabel('Hide Password').click();
  await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');
  await expect(page.locator('input[name="password"]')).toHaveValue('PTCLAdmin!2026');
  await page.getByRole('button', { name: 'Login to ProductFlow 360' }).click();
  await expect(page.locator('.splash')).toBeHidden();
}
async function openRFC(page: Page) {
  await page.getByRole('button', { name: 'RFC-0248 Flash Fiber — 100 Mbps speed upgrade', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose documents', exact: true })).toBeEnabled();
}

test('document validation accepts supported signatures and rejects invalid inputs', async () => {
  await expect(validateDocument(new File(['%PDF-1.7\n%%EOF'], 'spec.PDF'))).resolves.toBeUndefined();
  await expect(validateDocument(new File([new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])], 'spec.doc'))).resolves.toBeUndefined();
  await expect(validateDocument(new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'spec.docx'))).resolves.toBeUndefined();
  await expect(validateDocument(new File([new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70])], 'walkthrough.mp4'))).resolves.toBeUndefined();
  await expect(validateDocument(new File([], 'empty.pdf'))).rejects.toThrow('Empty');
  await expect(validateDocument(new File(['text'], 'renamed.pdf'))).rejects.toThrow('does not match');
  await expect(validateDocument(new File(['%PDF-1.7'], 'spec.exe'))).rejects.toThrow('supported project document');
});

test('login, signup and password visibility controls are interactive', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Login to ProductFlow 360' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Submit for approval' })).toBeVisible();
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  const password = page.locator('input[name="password"]');
  await password.fill('PTCLAdmin!2026');
  await page.getByLabel('Show Password').click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(password).toHaveValue('PTCLAdmin!2026');
  await page.getByLabel('Hide Password').click();
  await expect(password).toHaveAttribute('type', 'password');
  await expect(password).toHaveValue('PTCLAdmin!2026');
});

test('50 MB attachment persists, downloads intact, and can be removed; larger files are rejected', async ({ page }) => {
  await openWorkspace(page); await openRFC(page);
  await page.getByLabel('Upload RFC documents').setInputFiles(join(fixtures, 'too-large.pdf'));
  await expect(page.locator('.rfc-documents').getByRole('alert')).toContainText('50 MB or smaller');
  await expect(page.locator('.document-list li')).toHaveCount(0);
  await page.getByLabel('Upload RFC documents').setInputFiles(join(fixtures, 'exact-50mb.pdf'));
  await expect(page.locator('.document-list li')).toHaveCount(1);
  await expect(page.locator('.document-list')).toContainText('50.00 MB');
  await page.reload(); await expect(page.locator('.splash')).toBeHidden(); await openRFC(page);
  await expect(page.locator('.document-list')).toContainText('exact-50mb.pdf');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download exact-50mb.pdf' }).click();
  const download = await downloadPromise;
  expect(statSync((await download.path())!).size).toBe(MAX_DOCUMENT_BYTES);
  await page.getByRole('button', { name: 'Remove exact-50mb.pdf' }).click();
  await expect(page.getByRole('dialog', { name: 'Delete evidence?' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete evidence', exact: true }).click();
  await expect(page.locator('.document-list li')).toHaveCount(0);
  await page.reload(); await expect(page.locator('.splash')).toBeHidden(); await openRFC(page);
  await expect(page.locator('.document-list li')).toHaveCount(0);
});

test('Word files attach to their RFC; validation and quota failures do not add ghost attachments', async ({ page }) => {
  await openWorkspace(page); await openRFC(page);
  await page.getByLabel('Upload RFC documents').setInputFiles([
    { name: 'legacy.doc', mimeType: 'application/msword', buffer: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) },
    { name: 'modern.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04]) },
    { name: 'invalid.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a PDF') },
  ]);
  await expect(page.locator('.document-list li')).toHaveCount(2);
  await expect(page.locator('.rfc-documents').getByRole('alert')).toContainText('does not match');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'RFC-0247 Unified billing for enterprise customers', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose documents', exact: true })).toBeEnabled();
  await expect(page.locator('.document-list li')).toHaveCount(0);
  await page.evaluate(() => { IDBObjectStore.prototype.add = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  await page.getByLabel('Upload RFC documents').setInputFiles({ name: 'quota.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n%%EOF') });
  await expect(page.locator('.rfc-documents').getByRole('alert')).toContainText('browser storage is full');
  await expect(page.locator('.document-list li')).toHaveCount(0);
});

test('RFC creation opens attachment details and links a complete fail/retest/pass workflow', async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole('button', { name: 'New request', exact: true }).click();
  await page.getByLabel('Request title').fill('Billing reconciliation RFC');
  await page.getByLabel('Owner', { exact: true }).fill('Sofia Kaif');
  await page.getByLabel('Due date').fill('2026-10-01');
  await page.getByRole('button', { name: 'Create request', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Billing reconciliation RFC' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose documents', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Manage linked test cases' }).click();
  await page.getByRole('button', { name: 'New test case', exact: true }).click();
  await expect(page.getByLabel('Linked RFC').locator('option:checked')).toContainText('Billing reconciliation RFC');
  await page.getByLabel('Test stage', { exact: true }).selectOption('UAT');
  await page.getByLabel('Test case title').fill('Verify invoice total');
  await page.getByLabel('Test owner').fill('QA Engineer');
  await page.getByLabel('Test steps').fill('1. Generate invoice\n2. Compare the total against the agreed tariff');
  await page.getByLabel('Expected result', { exact: true }).fill('Invoice total matches the tariff.');
  await page.getByRole('button', { name: 'Save test case', exact: true }).click();
  await page.getByRole('button', { name: 'Mark ready', exact: true }).click();
  await page.getByRole('button', { name: 'Start test', exact: true }).click();
  await page.getByLabel('Result', { exact: true }).selectOption('Failed');
  await page.getByLabel('Actual result / evidence notes').fill('Tax was applied twice.');
  await page.getByRole('button', { name: 'Save execution result' }).click();
  await expect(page.locator('.run-history article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Start retest', exact: true }).click();
  await page.getByLabel('Actual result / evidence notes').fill('Fixed tariff calculation verified.');
  await page.getByRole('button', { name: 'Save execution result' }).click();
  await expect(page.locator('.run-history article')).toHaveCount(2);
  await page.reload(); await expect(page.locator('.splash')).toBeHidden();
  await page.getByRole('button', { name: 'Test management', exact: true }).click();
  await page.getByRole('button', { name: /TC-.*Verify invoice total/ }).click();
  await expect(page.locator('.run-history article')).toHaveCount(2);
  await expect(page.locator('.run-history')).toContainText('Tax was applied twice.');
  await expect(page.locator('.test-detail-meta')).toContainText('Passed');
  await page.getByLabel('Filter test status').selectOption('Failed');
  await expect(page.locator('.test-management tbody tr')).toHaveCount(0);
});

test('themes persist across reload and work on mobile without horizontal page overflow', async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /Ocean Blue/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean');
  await page.getByRole('button', { name: 'Purple button colour' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-button-colour', 'purple');
  await page.reload(); await expect(page.locator('.splash')).toBeHidden();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean');
  await expect(page.locator('html')).toHaveAttribute('data-button-colour', 'purple');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /Slate Gray/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'gray');
  await page.getByRole('button', { name: /High Contrast Light/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'contrast-light');
  await page.getByRole('button', { name: /High Contrast Dark/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'contrast-dark');
  await page.getByRole('button', { name: /Midnight/ }).click();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.screenshot({ path: 'test-results/midnight-desktop.png', fullPage: true });
  await page.reload(); await expect(page.locator('.splash')).toBeHidden();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.getByRole('button', { name: 'Test management', exact: true }).click();
  await page.screenshot({ path: 'test-results/tests-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('test lifecycle rejects skipped execution and retains previous runs', () => {
  const draft: TestCase = { id: 'TC-1', requestId: 'RFC-1', title: 'Example', stage: 'QA', priority: 'High', owner: 'QA', preconditions: '', steps: 'Run check', expected: 'Pass', status: 'Draft', runs: [] };
  const result = { id: 'run-1', actual: 'Success', tester: 'QA', at: new Date().toISOString(), result: 'Passed' as const };
  expect(() => recordTestRun(draft, result)).toThrow('Start the test');
  expect(() => changeTestStatus(draft, 'In progress')).toThrow('Mark the test ready');
  const running = changeTestStatus(changeTestStatus(draft, 'Ready'), 'In progress');
  expect(() => recordTestRun(running, { ...result, actual: ' ' })).toThrow('required');
  const passed = recordTestRun(running, result);
  const retest = changeTestStatus(passed, 'In progress');
  expect(retest.runs).toHaveLength(1);
  expect(draft.runs).toHaveLength(0);
});
