import { test, expect } from '@playwright/test';
import { brandAllure } from '../../src/utils/allure';
import { SettingsPage } from '../../src/ui/pages/settings.page';
import { WorkspacePage } from '../../src/ui/pages/workspace.page';
import { ProductsPage } from '../../src/ui/pages/products.page';
import { ChangeRequestsPage } from '../../src/ui/pages/change-requests.page';
import { TestCasePage } from '../../src/ui/pages/test-case.page';
import { RtmPage } from '../../src/ui/pages/rtm.page';

test.describe('@ui @component Settings', () => {
  test.beforeEach(async ({ page }) => { await new SettingsPage(page).open(); await brandAllure('Settings'); });
  test('theme choices are visible', async ({ page }) => { const l = new SettingsPage(page).locators; await expect(l.themes).toBeVisible(); await expect(l.themes.getByRole('button')).toHaveCount(8); });
  test('Ocean Blue selection is saved', async ({ page }) => { const l = new SettingsPage(page).locators; await l.theme('Ocean Blue').click(); await expect(l.theme('Ocean Blue')).toHaveAttribute('aria-pressed', 'true'); await expect(l.note).toContainText('Ocean Blue selected'); });
  test('Midnight selection is saved', async ({ page }) => { const l = new SettingsPage(page).locators; await l.theme('Midnight').click(); await expect(l.theme('Midnight')).toHaveAttribute('aria-pressed', 'true'); await expect(l.note).toContainText('Midnight selected'); });
  test('primary button colour can change', async ({ page }) => { const l = new SettingsPage(page).locators; await expect(l.colours).toBeVisible(); await l.colour('Blue').click(); await expect(l.colour('Blue')).toHaveAttribute('aria-pressed', 'true'); });
  test('profile action is available', async ({ page }) => { await expect(new SettingsPage(page).locators.profile).toBeVisible(); });
});

test.describe('@ui @component Workspace', () => {
  test.beforeEach(async ({ page }) => { await new WorkspacePage(page).open(); await brandAllure('Workspace'); });
  test('directory and active selector are visible', async ({ page }) => { const l = new WorkspacePage(page).locators; await expect(l.directory).toBeVisible(); await expect(l.selector).toBeVisible(); });
  test('creation form has required identity fields', async ({ page }) => { const w = new WorkspacePage(page); await w.begin(); await expect(w.locators.name).toBeVisible(); await expect(w.locators.owner).toBeVisible(); await expect(w.locators.date).toBeVisible(); });
  test('workspace form supports description and image', async ({ page }) => { const w = new WorkspacePage(page); await w.begin(); await expect(w.locators.description).toBeVisible(); await expect(w.locators.image).toHaveCount(1); });
  test('closing a draft leaves directory open', async ({ page }) => { const w = new WorkspacePage(page); await w.begin(); await w.locators.close.click(); await expect(w.locators.name).toHaveCount(0); await expect(w.locators.directory).toBeVisible(); });
  test('project creation is available', async ({ page }) => { const l = new WorkspacePage(page).locators; await l.project.click(); await expect(page.getByRole('textbox', { name: 'Project name' })).toBeVisible(); });
});

test.describe('@ui @component Products', () => {
  test.beforeEach(async ({ page }) => { await new ProductsPage(page).open(); await brandAllure('Products'); });
  for (const product of ['Flash Fiber', 'Enterprise', 'Smart TV', 'Voice']) {
    test(`${product} appears in the portfolio`, async ({ page }) => { await expect(new ProductsPage(page).locators.card(product)).toBeVisible(); });
  }
  test('product card opens its filtered change requests', async ({ page }) => { const l = new ProductsPage(page).locators; await l.card('Flash Fiber').click(); await expect(l.requestHeading).toBeVisible(); await expect(l.requestSearch).toHaveValue('Flash Fiber'); });
});

test.describe('@ui @component Change requests', () => {
  test.beforeEach(async ({ page }) => { await new ChangeRequestsPage(page).open(); await brandAllure('Change requests'); });
  test('request board has search, status and export', async ({ page }) => { const l = new ChangeRequestsPage(page).locators; await expect(l.table).toBeVisible(); await expect(l.search).toBeVisible(); await expect(l.status).toBeVisible(); await expect(l.export).toBeVisible(); });
  test('searching unknown request shows empty state', async ({ page }) => { const l = new ChangeRequestsPage(page).locators; await l.search.fill('PF360_NO_SUCH_REQUEST_7391'); await expect(l.empty).toBeVisible(); });
  test('status filter offers review through approval', async ({ page }) => { const l = new ChangeRequestsPage(page).locators; await expect(l.status.locator('option')).toHaveText(['All statuses', 'In review', 'In development', 'In testing', 'Approved']); });
  test('new request has product, priority and owner fields', async ({ page }) => { const r = new ChangeRequestsPage(page); await r.begin(); await expect(r.locators.title).toBeVisible(); await expect(r.locators.product).toBeVisible(); await expect(r.locators.priority).toBeVisible(); await expect(r.locators.owner).toBeVisible(); });
  test('closing a draft returns to the request board', async ({ page }) => { const r = new ChangeRequestsPage(page); await r.begin(); await r.locators.close.click(); await expect(r.locators.dialog).toHaveCount(0); await expect(r.locators.table).toBeVisible(); });
});

test.describe('@ui @component Test management', () => {
  test.beforeEach(async ({ page }) => { await new TestCasePage(page).open(); await brandAllure('Test management'); });
  test('board offers new test case', async ({ page }) => { const l = new TestCasePage(page).locators; await expect(l.board).toBeVisible(); await expect(l.create).toBeVisible(); });
  test('new case links to an RFC', async ({ page }) => { const t = new TestCasePage(page); await t.begin(); await expect(t.locators.linkedRfc).toBeVisible(); await expect(t.locators.linkedRfc.locator('option')).not.toHaveCount(0); });
  test('case form captures title, module, steps and result', async ({ page }) => { const t = new TestCasePage(page); await t.begin(); const l = t.locators; for (const field of [l.title, l.module, l.steps, l.expected]) await expect(field).toBeVisible(); });
  test('stages include smoke and regression', async ({ page }) => { const t = new TestCasePage(page); await t.begin(); await expect(t.locators.stageOptions).toContainText(['Smoke', 'Regression']); });
  test('cancel removes unsaved test case editor', async ({ page }) => { const t = new TestCasePage(page); await t.begin(); await t.locators.cancel.click(); await expect(t.locators.editorHeading).toHaveCount(0); });
});

test.describe('@ui @component RTM', () => {
  test.beforeEach(async ({ page }) => { await new RtmPage(page).open(); await brandAllure('RTM'); });
  test('import and create actions are visible', async ({ page }) => { const l = new RtmPage(page).locators; await expect(l.import).toBeVisible(); await expect(l.create).toBeVisible(); });
  test('new RTM accepts project name', async ({ page }) => { const r = new RtmPage(page); await r.begin(); await expect(r.locators.name).toBeVisible(); await expect(r.locators.submit).toBeVisible(); });
  test('all four initial case volumes are available', async ({ page }) => { const r = new RtmPage(page); await r.begin(); await expect(r.locators.volume.locator('option')).toHaveText(['100 test cases', '200 test cases', '300 test cases', '500 test cases']); });
  test('volume selection updates the draft', async ({ page }) => { const r = new RtmPage(page); await r.begin(); await r.locators.volume.selectOption('200'); await expect(r.locators.volume).toHaveValue('200'); });
  test('cancel closes unsaved RTM form', async ({ page }) => { const r = new RtmPage(page); await r.begin(); await r.locators.cancel.click(); await expect(r.locators.formHeading).toHaveCount(0); });
});
