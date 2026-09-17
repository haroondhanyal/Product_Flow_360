import { type Page } from '@playwright/test';
import { navigationLocators } from '../locators/navigation.locators';
export class SidebarComponent { constructor(private readonly page: Page) {} async open(module: string) { await navigationLocators(this.page).module(module).click(); } }
