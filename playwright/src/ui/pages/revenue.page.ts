import { type Page } from '@playwright/test';
import { LifecyclePage } from './lifecycle.page';
export class RevenuePage extends LifecyclePage { constructor(page: Page) { super(page, 'Revenue assurance', 'revenue check'); } }
