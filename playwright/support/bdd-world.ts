import { After, Before, setDefaultTimeout, setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { environment } from '../config/environment';

setDefaultTimeout(60_000);
const videoDir = resolve(process.cwd(), 'playwright/artifacts/bdd-videos');
mkdirSync(videoDir, { recursive: true });

export class BddWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  component = '';
  constructor(options: IWorldOptions) { super(options); }
}
setWorldConstructor(BddWorld);

Before(async function (this: BddWorld, scenario) {
  const componentTag = scenario.pickle.tags.find(tag => tag.name.startsWith('@component_'))?.name.replace('@component_', '') ?? 'Application';
  this.component = componentTag.replace(/([a-z])([A-Z])/g, '$1 $2');
  this.browser = await chromium.launch();
  this.context = await this.browser.newContext({
    baseURL: environment.baseUrl,
    recordVideo: { dir: videoDir },
    viewport: { width: 1440, height: 900 },
  });
  this.page = await this.context.newPage();
});

After(async function (this: BddWorld) {
  if (!this.page) return;
  await this.attach(await this.page.screenshot({ fullPage: true }), 'image/png');
  const video = this.page.video();
  await this.context.close();
  if (video) { const path = await video.path(); await this.attach(readFileSync(path), 'video/webm'); }
  await this.browser.close();
});
