import { type Page } from '@playwright/test';
import { LifecyclePage } from './lifecycle.page';
export class DefectPage extends LifecyclePage { constructor(page: Page) { super(page, 'Defects', 'defect'); } }
