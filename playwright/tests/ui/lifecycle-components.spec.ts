import { test, expect, type Page } from '@playwright/test';
import { brandAllure } from '../../src/utils/allure';
import { LifecyclePage } from '../../src/ui/pages/lifecycle.page';
import { BillingPage } from '../../src/ui/pages/billing.page';
import { RevenuePage } from '../../src/ui/pages/revenue.page';
import { ReleasePage } from '../../src/ui/pages/release.page';
import { RequirementPage } from '../../src/ui/pages/requirement.page';
import { DefectPage } from '../../src/ui/pages/defect.page';

const modules: { name: string; make: (page: Page) => LifecyclePage; types: string[]; statuses: string[] }[] = [
  { name: 'Billing validation', make: page => new BillingPage(page), types: ['Billing validation', 'Pre-bill validation'], statuses: ['Pending', 'Passed', 'Failed'] },
  { name: 'Revenue assurance', make: page => new RevenuePage(page), types: ['Revenue reconciliation', 'Leakage investigation'], statuses: ['Pending', 'Passed', 'Failed'] },
  { name: 'Releases', make: page => new ReleasePage(page), types: ['Standard', 'Hotfix'], statuses: ['Planned', 'Ready', 'Deployed', 'Verified', 'Closed', 'Rolled back'] },
  { name: 'Requirements', make: page => new RequirementPage(page), types: ['Idea', 'Business requirement', 'Functional requirement', 'User story', 'Acceptance criteria', 'Zero Hour', 'Development task'], statuses: ['Draft', 'In review', 'Approved', 'Rejected'] },
  { name: 'Defects', make: page => new DefectPage(page), types: ['Functional', 'Billing', 'Performance', 'Integration', 'UI'], statuses: ['Open', 'In progress', 'Fixed', 'Retesting', 'Closed', 'Reopened'] },
];

for (const module of modules) {
  test.describe(`@ui @component ${module.name}`, () => {
    test.beforeEach(async ({ page }) => { await module.make(page).open(); await brandAllure(module.name); });

    test('board shows searchable records and RFC filter', async ({ page }) => {
      const l = module.make(page).locators;
      await expect(l.search).toBeVisible();
      await expect(l.filterRfc).toBeVisible();
      await expect(l.table).toBeVisible();
    });

    test('new record exposes RFC, title and owner', async ({ page }) => {
      const board = module.make(page);
      await board.begin();
      await expect(board.locators.linkedRfc).toBeVisible();
      await expect(board.locators.title).toBeVisible();
      await expect(board.locators.owner).toBeVisible();
    });

    test('record types and lifecycle states match the module', async ({ page }) => {
      const board = module.make(page);
      await expect(board.locators.statuses.locator(':scope > span')).toHaveCount(module.statuses.length);
      for (const status of module.statuses) await expect(board.locators.statuses).toContainText(status);
      await board.begin();
      await expect(board.locators.recordType.locator('option')).toHaveText(module.types);
    });

    test('module-specific fields are available for the workflow', async ({ page }) => {
      const board = module.make(page);
      await board.begin();
      const l = board.locators;
      if (module.name === 'Billing validation' || module.name === 'Revenue assurance') {
        await expect(l.expected).toBeVisible();
        await expect(l.actual).toBeVisible();
      } else if (module.name === 'Releases') {
        await expect(l.rollout).toBeVisible();
        await expect(l.rollback).toBeVisible();
      } else {
        await expect(l.description).toBeVisible();
        await expect(l.linkedRecord).toBeVisible();
      }
    });

    test('cancel closes the draft without adding a record', async ({ page }) => {
      const board = module.make(page);
      const before = await board.locators.table.locator('tbody tr').count();
      await board.begin();
      await board.cancel();
      await expect(board.locators.table.locator('tbody tr')).toHaveCount(before);
    });
  });
}
