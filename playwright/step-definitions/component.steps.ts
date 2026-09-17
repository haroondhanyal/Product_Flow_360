import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { environment } from '../config/environment';
import { LoginPage } from '../src/ui/pages/login.page';
import { SidebarComponent } from '../src/ui/components/sidebar.component';
import { lifecycleLocators } from '../src/ui/locators/lifecycle.locators';
import { rtmLocators } from '../src/ui/locators/rtm.locators';
import { testCaseLocators } from '../src/ui/locators/test-case.locators';
import type { BddWorld } from '../support/bdd-world';

const definitions: Record<string, { nav: string; name: string; singular: string }> = {
  RTM: { nav: 'RTM', name: 'RTM', singular: 'RTM' }, Defects: { nav: 'Defects', name: 'Defects', singular: 'defect' },
  'Test Management': { nav: 'Test management', name: 'Test management', singular: 'test case' }, Requirements: { nav: 'Requirements', name: 'Requirements', singular: 'requirement' },
  'Revenue Assurance': { nav: 'Revenue assurance', name: 'Revenue assurance', singular: 'revenue check' },
};
const config = (screen: string) => { const value = definitions[screen]; if (!value) throw new Error(`Unknown BDD screen: ${screen}`); return value; };
const locators = (world: BddWorld, screen: string) => { const c = config(screen); return screen === 'RTM' ? rtmLocators(world.page) : screen === 'Test Management' ? testCaseLocators(world.page) : lifecycleLocators(world.page, c.name, c.singular); };

Given('an authenticated BDD user opens the {string} screen', async function (this: BddWorld, screen: string) { const login = new LoginPage(this.page); await login.open(); await login.login(environment.userEmail, environment.userPassword); await new SidebarComponent(this.page).open(config(screen).nav); });
Then('the {string} screen heading is visible', async function (this: BddWorld, screen: string) { await expect(locators(this, screen).heading).toBeVisible(); });
Then('the primary creation action is available', async function (this: BddWorld) { await expect(locators(this, this.component).create).toBeVisible(); });
When('the user starts a new record on {string}', async function (this: BddWorld, screen: string) { await locators(this, screen).create.click(); });
Then('the common creation fields are visible for {string}', async function (this: BddWorld, screen: string) { const l: any = locators(this, screen); if (screen === 'RTM') { await expect(l.name).toBeVisible(); await expect(l.volume).toBeVisible(); } else if (screen === 'Test Management') { await expect(l.linkedRfc).toBeVisible(); await expect(l.title).toBeVisible(); await expect(l.module).toBeVisible(); } else { await expect(l.linkedRfc).toBeVisible(); await expect(l.title).toBeVisible(); await expect(l.owner).toBeVisible(); } });
Then('the supported options include {string}', async function (this: BddWorld, values: string) { const expected = values.split(','); const l = this.component === 'RTM' ? rtmLocators(this.page).volume.locator('option') : testCaseLocators(this.page).stage.locator('option'); await expect(l).toHaveText(expected); });
Then('the workflow types include {string}', async function (this: BddWorld, values: string) { const c = config(this.component); await expect(lifecycleLocators(this.page, c.name, c.singular).recordType.locator('option')).toHaveText(values.split(',')); });
Then('the module specific fields are visible for {string}', async function (this: BddWorld, screen: string) { const l: any = locators(this, screen); if (screen === 'Revenue Assurance') { await expect(l.expected).toBeVisible(); await expect(l.actual).toBeVisible(); } else if (screen === 'Test Management') { await expect(l.steps).toBeVisible(); await expect(l.expected).toBeVisible(); } else { await expect(l.description).toBeVisible(); await expect(l.linkedRecord).toBeVisible(); } });
Then('the priority selector offers standard delivery priorities', async function (this: BddWorld) { const c = config(this.component); await expect(lifecycleLocators(this.page, c.name, c.singular).priority.locator('option')).toHaveText(['Critical', 'High', 'Medium', 'Low']); });
Then('the linked RFC selector contains delivery requests', async function (this: BddWorld) { await expect(testCaseLocators(this.page).linkedRfc.locator('option')).not.toHaveCount(0); });
Then('import and search controls are available for {string}', async function (this: BddWorld, screen: string) { const l: any = locators(this, screen); if (screen === 'RTM') await expect(l.import).toBeVisible(); else if (screen === 'Test Management') { await expect(l.board).toBeVisible(); } else { await expect(l.search).toBeVisible(); await expect(l.filterRfc).toBeVisible(); } });
When('the user selects {string} as the RTM volume', async function (this: BddWorld, value: string) { await rtmLocators(this.page).volume.selectOption(value); });
Then('the selected RTM volume is {string}', async function (this: BddWorld, value: string) { await expect(rtmLocators(this.page).volume).toHaveValue(value); });
When('the user cancels the current BDD draft on {string}', async function (this: BddWorld, screen: string) { await locators(this, screen).cancel.click(); });
Then('the creation editor is closed for {string}', async function (this: BddWorld, screen: string) { const l: any = locators(this, screen); await expect(screen === 'RTM' ? l.formHeading : screen === 'Test Management' ? l.editorHeading : l.formHeading).toHaveCount(0); });
