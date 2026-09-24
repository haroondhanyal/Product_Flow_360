import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const results = resolve(root, 'allure-results');
const report = resolve(root, 'reports/allure');
const savedHistory = resolve(root, '.allure-history');
const logo = resolve(root, '../apps/web/public/logo.svg');
const bddReport = process.env.ALLURE_REPORT_MODE === 'bdd';
const combinedReport = process.env.ALLURE_REPORT_MODE === 'combined';
mkdirSync(results, { recursive: true });
const caseCounts = { ui: 0, api: 0, bdd: 0 };

const sections = ['Employee signup', 'Employee password recovery', 'Settings', 'Workspace', 'Products', 'Change requests', 'Test management', 'RTM', 'Billing validation', 'Revenue assurance', 'Releases', 'Requirements', 'Defects', 'Authentication'];
const titleCase = value => value.replace(/(^|[\s-])\w/g, match => match.toUpperCase());
const sectionFor = result => {
  const componentTag = (result.labels ?? []).find(label => label.name === 'tag' && label.value.startsWith('@component_'))?.value;
  if (componentTag) return componentTag.slice('@component_'.length).replace(/([a-z])([A-Z])/g, '$1 $2');
  const text = `${result.fullName ?? ''} ${result.name ?? ''}`;
  return sections.find(section => text.toLowerCase().includes(section.toLowerCase()))
    ?? (text.includes('e2e-create-flow') ? 'End-to-End Delivery' : text.includes('smoke') ? 'Smoke Coverage' : text.includes('coverage-matrix') ? 'Coverage Matrix' : 'Application Coverage');
};
const replaceLabel = (labels, name, value) => [...labels.filter(label => label.name !== name), { name, value }];

for (const file of readdirSync(results).filter(file => file.endsWith('-result.json'))) {
  const path = resolve(results, file);
  const result = JSON.parse(readFileSync(path, 'utf8'));
  const section = sectionFor(result);
  const isBdd = (result.labels ?? []).some(label => label.name === 'framework' && label.value === 'cucumberjs') || (result.labels ?? []).some(label => label.name === 'layer' && label.value === 'bdd');
  const isApi = !isBdd && (result.fullName?.includes('/api/') || result.fullName?.startsWith('api/') || (result.labels ?? []).some(label => label.name === 'tag' && ['api', '@api'].includes(label.value)));
  const layer = isBdd ? 'BDD' : isApi ? 'API' : result.fullName?.includes('e2e') ? 'End-to-End' : 'UI Automation';
  caseCounts[isBdd ? 'bdd' : isApi ? 'api' : 'ui']++;
  let labels = result.labels ?? [];
  for (const [name, value] of [
    ['epic', isBdd ? 'BDD Cases' : isApi ? 'APIs Automation' : 'UI Automation'], ['feature', section], ['parentSuite', isBdd ? 'BDD Cases' : isApi ? 'APIs Automation' : 'UI Automation'],
    ['suite', section], ['subSuite', titleCase(result.name ?? 'Automated checks')],
    ['package', `com.ptcl.productflow360.${layer.toLowerCase().replaceAll(/[^a-z]+/g, '.')}.${section.toLowerCase().replaceAll(/[^a-z]+/g, '.')}`],
    ['owner', 'Raja Haroon'], ['designation', 'Full Stack QA Automation'], ['layer', layer.toLowerCase()],
    ['component', section], ['environment', 'Local Chromium'],
  ]) labels = replaceLabel(labels, name, value);
  result.labels = labels;
  result.description = result.description ?? `ProductFlow 360 ${section} validation. Includes assertion evidence, final screenshot and complete execution video.`;
  result.statusDetails = result.statusDetails ?? {};
  if (result.status === 'passed') result.statusDetails.message = `ProductFlow 360 component: ${section}`;
  writeFileSync(path, JSON.stringify(result));
}

writeFileSync(resolve(results, 'environment.properties'), [
  'Product=ProductFlow 360', `Test Suite=${bddReport ? 'BDD Cases' : combinedReport ? 'UI Automation + APIs Automation + BDD Cases' : 'UI Automation'}`, 'Browser=Chromium',
  `UI Automation Cases=${caseCounts.ui}`, `APIs Automation Cases=${caseCounts.api}`, `BDD Cases=${caseCounts.bdd}`,
  'Environment=Local QA', 'Owner=Raja Haroon', 'Designation=Full Stack QA Automation',
  `Framework=${bddReport ? 'Cucumber + Playwright + Allure' : combinedReport ? 'Cucumber + Playwright + Allure' : 'Playwright + Allure'}`, 'Evidence=Screenshot and video for every test',
].join('\n') + '\n');

writeFileSync(resolve(results, 'categories.json'), JSON.stringify([
  ...sections.map(section => ({ name: `${section} · Passed coverage`, matchedStatuses: ['passed'], messageRegex: `.*ProductFlow 360 component: ${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*` })),
  { name: 'End-to-End Delivery · Passed coverage', matchedStatuses: ['passed'], messageRegex: '.*ProductFlow 360 component: End-to-End Delivery.*' },
  { name: 'Smoke Coverage · Passed coverage', matchedStatuses: ['passed'], messageRegex: '.*ProductFlow 360 component: Smoke Coverage.*' },
  { name: 'Coverage Matrix · Passed coverage', matchedStatuses: ['passed'], messageRegex: '.*ProductFlow 360 component: Coverage Matrix.*' },
  { name: 'Other passed automation checks', matchedStatuses: ['passed'] },
  { name: 'Application assertion failures', matchedStatuses: ['failed'], messageRegex: '.*(expect|assert|Expected|received).*' },
  { name: 'Locator and timeout failures', matchedStatuses: ['failed', 'broken'], messageRegex: '.*(locator|Timeout|timed out).*' },
  { name: 'Environment and infrastructure errors', matchedStatuses: ['broken'], messageRegex: '.*(ECONN|server|browser|network|JAVA_HOME).*' },
  { name: 'Skipped or pending coverage', matchedStatuses: ['skipped'] },
  { name: 'Other product defects', matchedStatuses: ['failed'] },
  { name: 'Other test defects', matchedStatuses: ['broken', 'unknown'] },
], null, 2));

const buildOrder = Number(process.env.BUILD_NUMBER) || Math.floor(Date.now() / 1000);
writeFileSync(resolve(results, 'executor.json'), JSON.stringify({
  reportName: `ProductFlow 360 Full Regression · ${new Date().toLocaleString('en-GB')}`,
  buildOrder,
  reportUrl: 'http://127.0.0.1:5051',
  name: process.env.CI ? 'ProductFlow 360 CI' : 'ProductFlow 360 Local Runner',
  type: process.env.GITHUB_ACTIONS ? 'github' : 'jenkins',
  buildName: `PF360 Chromium Regression #${buildOrder}`,
  buildUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions` : 'http://127.0.0.1:5051',
}, null, 2));

if (existsSync(logo)) cpSync(logo, resolve(results, 'pf360-logo.svg'));
const cliEnvironment = { ...process.env };
if (cliEnvironment.JAVA_HOME && !existsSync(resolve(cliEnvironment.JAVA_HOME, 'bin/java'))) delete cliEnvironment.JAVA_HOME;
execFileSync('npx', ['allure', 'generate', results, '--clean', '-o', report, '--report-name', bddReport ? 'BDD Cases | ProductFlow 360' : combinedReport ? 'ProductFlow 360 | UI + APIs + BDD Cases' : 'ProductFlow 360 | UI Automation'], { stdio: 'inherit', env: cliEnvironment });

rmSync(savedHistory, { recursive: true, force: true });
if (existsSync(resolve(report, 'history'))) cpSync(resolve(report, 'history'), savedHistory, { recursive: true });

if (existsSync(logo)) {
  cpSync(logo, resolve(report, 'pf360-logo.svg'));
  const index = resolve(report, 'index.html');
  const branding = `<style>
  body{padding-top:142px!important;box-sizing:border-box}
  .pf360-report-brand{--pf-bg:linear-gradient(110deg,#fff 0%,#f2faf5 55%,#e8f5ed 100%);--pf-fg:#173f52;--pf-muted:#667b85;--pf-accent:#087c59;position:fixed;inset:0 0 auto;z-index:99999;display:flex;align-items:center;justify-content:center;gap:22px;width:100%;min-height:142px;padding:14px 28px;box-sizing:border-box;border:0;border-bottom:1px solid #d7e7de;background:var(--pf-bg);box-shadow:0 5px 22px #173f5218;font-family:Arial,sans-serif;color:var(--pf-fg);text-align:left;transition:background .18s,color .18s,border-color .18s}
  .pf360-report-brand[data-theme="dark"]{--pf-bg:linear-gradient(110deg,#17212b,#202e39);--pf-fg:#f1f5f8;--pf-muted:#c0ccd5;--pf-accent:#8be0bd;border-color:#40515e;box-shadow:0 5px 22px #0008}
  .pf360-report-brand[data-theme="gray"]{--pf-bg:linear-gradient(110deg,#eceff1,#d9dee2);--pf-fg:#263238;--pf-muted:#4e5b61;--pf-accent:#455a64;border-color:#aeb7bc}
  .pf360-report-brand[data-theme="blue"]{--pf-bg:linear-gradient(110deg,#102a48,#1a4a72);--pf-fg:#eff7ff;--pf-muted:#c4d9ea;--pf-accent:#60c5f2;border-color:#38648a;box-shadow:0 5px 22px #07182d88}
  .pf360-report-brand[data-theme="green"]{--pf-bg:linear-gradient(110deg,#123b2d,#1d6346);--pf-fg:#f0fff6;--pf-muted:#c5e4d1;--pf-accent:#6fe0a3;border-color:#3b805e;box-shadow:0 5px 22px #07180f88}
  .pf360-report-brand[data-theme="contrast"]{--pf-bg:#000;--pf-fg:#fff;--pf-muted:#fff;--pf-accent:#ffff00;border:3px solid #ffff00;box-shadow:none}
  .pf360-report-brand img{display:block;width:96px;height:96px;flex:0 0 96px;object-fit:contain;border-radius:24px;box-shadow:0 8px 22px #087c5928}.pf360-report-brand-copy{min-width:0}.pf360-report-brand b{display:block;font-size:32px;line-height:1.1;letter-spacing:-.7px}.pf360-report-brand small{display:block;color:var(--pf-accent);font-size:12px;font-weight:800;letter-spacing:1.25px;margin-top:8px}.pf360-report-brand em{display:block;color:var(--pf-muted);font-size:12px;font-style:normal;margin-top:6px}.pf360-report-themes{position:absolute;right:24px;top:50%;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px;transform:translateY(-50%)}.pf360-report-themes button{min-height:34px;padding:7px 10px;border:1px solid var(--pf-muted);border-radius:8px;background:transparent;color:var(--pf-fg);font:700 11px Arial,sans-serif;cursor:pointer}.pf360-report-themes button[aria-pressed="true"]{border-color:var(--pf-accent);background:var(--pf-accent);color:#fff}.pf360-report-brand[data-theme="contrast"] .pf360-report-themes button[aria-pressed="true"]{color:#000}.pf360-report-themes button:focus-visible{outline:3px solid var(--pf-accent);outline-offset:2px}
  .pf360-report-links{position:absolute;left:18px;top:50%;display:flex;gap:7px;transform:translateY(-50%)}.pf360-report-links a{padding:9px 11px;border:1px solid var(--pf-muted);border-radius:8px;color:var(--pf-fg);font:700 11px Arial,sans-serif;text-decoration:none;white-space:nowrap}.pf360-report-links a:hover,.pf360-report-links a[aria-current="page"]{border-color:var(--pf-accent);background:var(--pf-accent);color:#fff}.pf360-report-brand[data-theme="contrast"] .pf360-report-links a[aria-current="page"]{color:#000}
  @media(max-width:1120px){.pf360-report-links{left:12px;top:auto;bottom:9px;transform:none}.pf360-report-links a{padding:6px 8px;font-size:10px}}
  @media(max-width:920px){.pf360-report-brand{justify-content:flex-start;padding-right:18px}.pf360-report-themes{position:static;transform:none;margin-left:auto;max-width:280px}}
  @media(max-width:640px){body{padding-top:148px!important}.pf360-report-brand{min-height:148px;flex-wrap:wrap;justify-content:center;gap:8px;padding:8px 10px}.pf360-report-brand img{width:56px;height:56px;flex-basis:56px;border-radius:15px}.pf360-report-brand b{font-size:22px}.pf360-report-brand small{font-size:8px;letter-spacing:.5px;margin-top:5px}.pf360-report-brand em{font-size:9px;margin-top:4px}.pf360-report-themes{width:100%;max-width:none;margin:0;justify-content:center;gap:5px}.pf360-report-themes button{min-height:29px;padding:5px 8px;font-size:10px}}
  </style><header class="pf360-report-brand" data-theme="light"><nav class="pf360-report-links" aria-label="Report navigation"><a href="/reports/allure/index.html" target="_blank" rel="noopener" aria-current="page">View Allure report</a><a href="/reports/allure/performance/index.html" target="_blank" rel="noopener">View performance report ↗</a></nav><img src="pf360-logo.svg" alt="ProductFlow 360 logo"><div class="pf360-report-brand-copy"><b>ProductFlow 360</b><small>${bddReport ? 'GHERKIN AUTOMATION REPORT' : combinedReport ? 'UI AUTOMATION · APIs AUTOMATION · BDD CASES' : 'UI AUTOMATION REPORT'}</small><em>${caseCounts.ui + caseCounts.api + caseCounts.bdd} cases · UI ${caseCounts.ui} · APIs ${caseCounts.api} · BDD ${caseCounts.bdd} · Raja Haroon · Full Stack QA Automation</em></div><nav class="pf360-report-themes" aria-label="Header theme"><button type="button" data-theme-choice="light" aria-pressed="true">Light</button><button type="button" data-theme-choice="dark" aria-pressed="false">Dark</button><button type="button" data-theme-choice="gray" aria-pressed="false">Gray</button><button type="button" data-theme-choice="blue" aria-pressed="false">Blue</button><button type="button" data-theme-choice="green" aria-pressed="false">Green</button><button type="button" data-theme-choice="contrast" aria-pressed="false">High contrast</button></nav></header><script>(function(){const header=document.querySelector('.pf360-report-brand');if(!header)return;const buttons=[...header.querySelectorAll('[data-theme-choice]')];function setTheme(theme){if(!buttons.some(button=>button.dataset.themeChoice===theme))theme='light';header.dataset.theme=theme;buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeChoice===theme)));try{localStorage.setItem('pf360-allure-header-theme',theme)}catch{}}buttons.forEach(button=>button.addEventListener('click',()=>setTheme(button.dataset.themeChoice)));let saved='light';try{saved=localStorage.getItem('pf360-allure-header-theme')||'light'}catch{}setTheme(saved)})();</script>`;
  writeFileSync(index, readFileSync(index, 'utf8').replace('<body>', `<body>${branding}`));
}
console.log(`Allure report created: ${report}`);
