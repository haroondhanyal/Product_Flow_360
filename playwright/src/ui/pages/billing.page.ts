import { type Page } from '@playwright/test';
import { LifecyclePage } from './lifecycle.page';
export class BillingPage extends LifecyclePage { constructor(page: Page) { super(page, 'Billing validation', 'billing check'); } }
