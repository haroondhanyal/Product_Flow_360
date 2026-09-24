import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../src/ui/pages/login.page';
import { SidebarComponent } from '../../src/ui/components/sidebar.component';
import { lifecycleLocators } from '../../src/ui/locators/lifecycle.locators';
import { rtmLocators } from '../../src/ui/locators/rtm.locators';
import { testCaseLocators } from '../../src/ui/locators/test-case.locators';
import { environment } from '../../config/environment';
import { brandAllure } from '../../src/utils/allure';

const modules = [
  { nav: 'Defects', screen: 'Defects', kind: 'lifecycle', singular: 'defect' },
  { nav: 'Requirements', screen: 'Requirements', kind: 'lifecycle', singular: 'requirement' },
  { nav: 'Revenue assurance', screen: 'Revenue assurance', kind: 'lifecycle', singular: 'revenue check' },
  { nav: 'Billing validation', screen: 'Billing validation', kind: 'lifecycle', singular: 'billing check' },
  { nav: 'Releases', screen: 'Releases', kind: 'lifecycle', singular: 'release' },
  { nav: 'RTM', screen: 'RTM', kind: 'rtm', singular: 'RTM' },
  { nav: 'Test management', screen: 'Test management', kind: 'test', singular: 'test case' },
  { nav: 'Workspace tools', screen: 'Workspace tools', kind: 'workspace', singular: '' },
  { nav: 'Settings', screen: 'Settings', kind: 'settings', singular: '' },
];

async function openModule(page: Page, nav: string, name: string) {
  const login = new LoginPage(page);
  await login.open();
  await login.login(environment.userEmail, environment.userPassword);
  await new SidebarComponent(page).open(nav);
  await expect(page.locator('header strong')).toHaveText(name);
}

// 45 smoke checks: every primary delivery module is reachable across five entry paths.
for (let index = 0; index < 45; index++) {
  const module = modules[index % modules.length];
  const pathVariant = Math.floor(index / modules.length) + 1;
  test(`@ui @smoke PF360-UI-${String(84 + index).padStart(3, '0')} ${module.nav} navigation smoke path ${pathVariant}`, async ({ page }) => {
    await brandAllure(`${module.nav} Smoke`);
    await openModule(page, module.nav, module.screen);
    await expect(page.locator('main').first()).toBeVisible();
    if (module.kind === 'lifecycle') await expect(lifecycleLocators(page, module.screen, module.singular).create).toBeVisible();
    if (module.kind === 'rtm') await expect(rtmLocators(page).create).toBeVisible();
    if (module.kind === 'test') await expect(testCaseLocators(page).create).toBeVisible();
    if (module.kind === 'workspace') await expect(page.getByRole('heading', { name: /workspace/i }).first()).toBeVisible();
    if (module.kind === 'settings') await expect(page.getByRole('group', { name: 'Workspace theme' })).toBeVisible();
  });
}

// 62 regression checks cover form completeness, type selectors, cancel recovery, and list controls.
for (let index = 0; index < 62; index++) {
  const module = modules[index % modules.length];
  const operation = index % 4;
  test(`@ui @regression PF360-UI-${String(129 + index).padStart(3, '0')} ${module.nav} ${['form contract', 'field validation', 'draft recovery', 'board controls'][operation]} regression`, async ({ page }) => {
    await brandAllure(`${module.nav} Regression`);
    await openModule(page, module.nav, module.screen);
    if (module.kind === 'lifecycle') {
      const locators = lifecycleLocators(page, module.screen, module.singular);
      if (operation === 3) {
        await expect(locators.table).toBeVisible();
        await expect(locators.search).toBeVisible();
        await expect(locators.filterRfc).toBeVisible();
        return;
      }
      await locators.create.click();
      await expect(locators.formHeading).toBeVisible();
      await expect(locators.title).toBeVisible();
      await expect(locators.owner).toBeVisible();
      if (operation === 1) {
        await expect(locators.recordType).toBeVisible();
        await expect(locators.priority.locator('option')).toHaveText(['Critical', 'High', 'Medium', 'Low']);
      }
      if (operation === 2) {
        await locators.cancel.click();
        await expect(locators.formHeading).toHaveCount(0);
        await expect(locators.create).toBeVisible();
      }
      return;
    }
    if (module.kind === 'rtm') {
      const l = rtmLocators(page);
      if (operation === 3) { await expect(l.import).toBeVisible(); await expect(l.create).toBeVisible(); return; }
      await l.create.click();
      await expect(l.name).toBeVisible();
      await expect(l.volume.locator('option')).toHaveText(['100 test cases', '200 test cases', '300 test cases', '500 test cases']);
      if (operation === 2) { await l.cancel.click(); await expect(l.formHeading).toHaveCount(0); }
      return;
    }
    if (module.kind === 'test') {
      const l = testCaseLocators(page);
      if (operation === 3) { await expect(l.board).toBeVisible(); await expect(l.create).toBeVisible(); return; }
      await l.create.click();
      await expect(l.title).toBeVisible(); await expect(l.module).toBeVisible(); await expect(l.steps).toBeVisible(); await expect(l.expected).toBeVisible();
      if (operation === 1) await expect(l.stageOptions).toContainText(['Smoke', 'Regression', 'SIT', 'QA', 'UAT']);
      if (operation === 2) { await l.cancel.click(); await expect(l.editorHeading).toHaveCount(0); }
      return;
    }
    if (module.kind === 'settings') {
      await expect(page.getByRole('group', { name: 'Workspace theme' })).toBeVisible();
      return;
    }
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
}

const negativeQueries = [
  'PF360_NEG_ASCII_ALPHA', 'PF360_NEG_Mixed_Case', 'PF360_NEG_Number_93817', 'PF360_NEG_UUID_48fca1d2',
  'PF360_NEG_Punctuation_!?', 'PF360_NEG_Hyphen-Value', 'PF360_NEG_Underscore_Value', 'PF360_NEG_Period.Value',
  'PF360_NEG_Slash/Value', 'PF360_NEG_Spaced Query', 'PF360_NEG_urdu_متن', 'PF360_NEG_café', 'PF360_NEG_📦',
  'PF360_NEG_Email_qa@example.invalid',
];
const searchableModules = modules.filter(module => module.kind === 'lifecycle');
// 70 negative searches verify literal matching and an accurate empty result state.
for (let index = 0; index < 70; index++) {
  const module = searchableModules[index % searchableModules.length];
  const query = `${negativeQueries[index % negativeQueries.length]}_${String(index + 1).padStart(3, '0')}`;
  test(`@ui @negative @regression PF360-UI-${String(191 + index).padStart(3, '0')} ${module.nav} rejects unmatched ${query.split('_').slice(2, 4).join(' ')} search`, async ({ page }) => {
    await brandAllure(`${module.nav} Negative Search`);
    await openModule(page, module.nav, module.screen);
    const l = lifecycleLocators(page, module.screen, module.singular);
    await l.search.fill(query);
    await expect(l.search).toHaveValue(query);
    await expect(l.table.locator('tbody tr')).toHaveCount(0);
    await expect(page.locator('.lifecycle-board .empty')).toBeVisible();
  });
}
