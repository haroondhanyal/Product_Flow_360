export default {
  paths: ['playwright/features/rtm/*.feature', 'playwright/features/defects/*.feature', 'playwright/features/test-management/*.feature', 'playwright/features/requirements/*.feature', 'playwright/features/revenue-assurance/*.feature'],
  import: ['allure-cucumberjs', 'playwright/support/**/*.ts', 'playwright/step-definitions/**/*.ts'],
  format: ['progress-bar', 'allure-cucumberjs/reporter'],
  formatOptions: { resultsDir: 'playwright/allure-results' },
  parallel: 0,
};
