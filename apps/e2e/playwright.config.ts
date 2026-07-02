import { defineConfig, devices } from '@playwright/test'

/**
 * E2E setup: boots the API (3001) and the Nuxt dev server (3000) against the
 * local docker Postgres. global-setup resets and seeds the database.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  globalSetup: './global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    locale: 'de-DE',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @print-shop/api start',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      cwd: '../..',
      timeout: 60_000,
      env: {
        DATABASE_URL:
          process.env.DATABASE_URL ??
          'postgresql://printshop:printshop@localhost:5432/printshop?schema=public',
        NODE_ENV: 'development',
      },
    },
    {
      command: 'pnpm --filter @print-shop/web dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      cwd: '../..',
      timeout: 180_000,
    },
  ],
})
