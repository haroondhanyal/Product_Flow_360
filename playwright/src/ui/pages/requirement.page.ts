import { type Page } from '@playwright/test';
import { LifecyclePage } from './lifecycle.page';
export class RequirementPage extends LifecyclePage { constructor(page: Page) { super(page, 'Requirements', 'requirement'); } }
