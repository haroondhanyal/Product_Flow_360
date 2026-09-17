import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const results = resolve(import.meta.dirname, '../allure-results');
const reportHistory = resolve(import.meta.dirname, '../reports/allure/history');
const savedHistory = resolve(import.meta.dirname, '../.allure-history');
if (existsSync(reportHistory)) {
  rmSync(savedHistory, { recursive: true, force: true });
  cpSync(reportHistory, savedHistory, { recursive: true });
}
rmSync(results, { recursive: true, force: true });
mkdirSync(results, { recursive: true });
if (existsSync(savedHistory)) cpSync(savedHistory, resolve(results, 'history'), { recursive: true });
