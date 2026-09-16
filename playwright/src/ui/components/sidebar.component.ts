import { type Page } from '@playwright/test';
export class SidebarComponent { constructor(private readonly page: Page) {} async open(module: string) { await this.page.getByRole('button', { name: module, exact: true }).click(); } }
