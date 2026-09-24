import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';
import { allure } from 'allure-playwright';
import { environment } from '../../config/environment';

type Evidence = { page: Page; show: (title: string, method: string, endpoint: string, status: number, body: string) => Promise<void> };
export const apiTest = base.extend<{ apiEvidence: Evidence }>({
  apiEvidence: async ({ browser }, use, testInfo) => {
    const dir = resolve(process.cwd(), 'playwright/artifacts/api-videos');
    mkdirSync(dir, { recursive: true });
    const context = await browser.newContext({ recordVideo: { dir }, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(environment.baseUrl);
    const evidence: Evidence = {
      page,
      show: async (title, method, endpoint, status, body) => {
        await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#f2f7f4;color:#173f52;font:16px Arial,sans-serif}.card{max-width:920px;margin:80px auto;background:#fff;border:1px solid #d7e7de;border-radius:18px;padding:32px;box-shadow:0 12px 40px #173f5218}header{display:flex;align-items:center;gap:18px;border-bottom:1px solid #e3ede7;padding-bottom:20px}img{width:68px;height:68px}h1{font-size:26px;margin:0}small{display:block;margin-top:8px;color:#087c59;font-weight:bold;letter-spacing:1px}.meta{display:grid;grid-template-columns:110px 1fr;gap:12px;margin-top:22px}.status{font-size:20px;font-weight:bold;color:${status < 400 ? '#087c59' : '#b33c2e'}}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f7faf8;border-radius:10px;padding:16px;margin-top:18px;max-height:420px;overflow:auto}</style></head><body><article class="card"><header><img src="${environment.baseUrl}/logo.svg" alt="ProductFlow 360"><div><h1>${escapeHtml(title)}</h1><small>PRODUCTFLOW 360 · API AUTOMATION EVIDENCE</small></div></header><div class="meta"><b>Request</b><span>${escapeHtml(method)} ${escapeHtml(endpoint)}</span><b>HTTP status</b><span class="status">${status}</span><b>Result</b><span>Response contract assertion recorded</span></div><pre>${escapeHtml(body.slice(0, 12000))}</pre></article></body></html>`);
      },
    };
    try {
      await use(evidence);
      await allure.attachment('API response screenshot', await page.screenshot({ fullPage: true }), 'image/png');
    } finally {
      const video = page.video();
      await context.close();
      if (video) await allure.attachment('API execution video', readFileSync(await video.path()), 'video/webm');
    }
  },
});
export { expect };
export type ApiHarness = { request: APIRequestContext; apiEvidence: Evidence };
export function escapeHtml(value: string) { return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
