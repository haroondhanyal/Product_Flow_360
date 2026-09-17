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
  const layer = isBdd ? 'BDD' : result.fullName?.includes('/api/') ? 'API' : result.fullName?.includes('e2e') ? 'End-to-End' : 'UI Components';
  let labels = result.labels ?? [];
  for (const [name, value] of [
    ['epic', isBdd ? 'ProductFlow 360 BDD' : 'ProductFlow 360 Playwright'], ['feature', section], ['parentSuite', isBdd ? 'BDD Cases' : 'Playwright Cases'],
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
  'Product=ProductFlow 360', `Test Suite=${bddReport ? 'BDD Cases' : combinedReport ? 'BDD Cases + Playwright Cases' : 'Playwright Cases'}`, 'Browser=Chromium',
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
execFileSync('npx', ['allure', 'generate', results, '--clean', '-o', report, '--report-name', bddReport ? 'BDD Cases | ProductFlow 360' : combinedReport ? 'ProductFlow 360 | BDD + Playwright Cases' : 'ProductFlow 360 | Playwright Cases'], { stdio: 'inherit', env: cliEnvironment });

rmSync(savedHistory, { recursive: true, force: true });
if (existsSync(resolve(report, 'history'))) cpSync(resolve(report, 'history'), savedHistory, { recursive: true });

if (existsSync(logo)) {
  cpSync(logo, resolve(report, 'pf360-logo.svg'));
  const index = resolve(report, 'index.html');
  const branding = `<style>
  .pf360-report-brand{position:fixed;right:24px;top:10px;z-index:99999;display:flex;align-items:center;gap:14px;padding:10px 18px 10px 12px;border:1px solid #b8ddc9;border-radius:14px;background:linear-gradient(135deg,#fff 0%,#eefaf4 100%);box-shadow:0 8px 28px #173f5230;font-family:Arial,sans-serif;color:#173f52}
  .pf360-report-brand img{width:64px;height:64px;object-fit:contain}.pf360-report-brand b{display:block;font-size:18px;letter-spacing:-.2px}.pf360-report-brand small{display:block;color:#087c59;font-size:10px;font-weight:700;letter-spacing:.8px;margin-top:5px}.pf360-report-brand em{display:block;color:#667b85;font-size:10px;font-style:normal;margin-top:3px}
  @media(max-width:900px){.pf360-report-brand{right:8px;top:8px;padding:6px}.pf360-report-brand img{width:42px;height:42px}.pf360-report-brand span{display:none}}
  </style><script>addEventListener('DOMContentLoaded',()=>{const b=document.createElement('div');b.className='pf360-report-brand';b.innerHTML='<img src="pf360-logo.svg" alt="ProductFlow 360"><span><b>${bddReport ? 'BDD Cases' : 'ProductFlow 360'}</b><small>${bddReport ? 'PRODUCTFLOW 360 · GHERKIN AUTOMATION' : combinedReport ? 'BDD + PLAYWRIGHT AUTOMATION REPORT' : 'PLAYWRIGHT AUTOMATION REPORT'}</small><em>Raja Haroon · Full Stack QA Automation</em></span>';document.body.append(b)})</script>`;
  writeFileSync(index, readFileSync(index, 'utf8').replace('</body>', `${branding}</body>`));
}
console.log(`Allure report created: ${report}`);
