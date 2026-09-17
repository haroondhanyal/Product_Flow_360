import { type Page } from '@playwright/test';
import { LifecyclePage } from './lifecycle.page';
export class ReleasePage extends LifecyclePage { constructor(page: Page) { super(page, 'Releases', 'release'); } }
