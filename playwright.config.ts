import { defineConfig } from '@playwright/test';
import path from 'node:path';

if (!process.env.VALIDATION_RESULTS_DIR) throw new Error('Run browser checks with npm run test:e2e to isolate credentials and data.');
const reports = process.env.VALIDATION_RESULTS_DIR;
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90000,
  globalTimeout: 8 * 60 * 1000,
  expect: { timeout: 15000 },
  outputDir: path.join(reports, 'browser-results'),
  reporter: [['list'], ['junit', { outputFile: path.join(reports, 'browser.xml') }],
    ['html', { outputFolder: path.join(reports, 'browser-report'), open: 'never' }]],
  use: { actionTimeout: 15000, navigationTimeout: 45000, baseURL: 'http://127.0.0.1:3217', serviceWorkers: 'block',
    trace: 'retain-on-failure', screenshot: 'only-on-failure', acceptDownloads: true },
  projects: [
    { name: 'desktop-chromium', use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile-chromium', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: { command: 'node scripts/validation/start-demo.mjs',
    url: 'http://127.0.0.1:3217/api/health', reuseExistingServer: false, timeout: 120000,
    env: { APP_ENV: 'demo', NODE_ENV: 'development' }, stdout: 'ignore', stderr: 'pipe' },
});
