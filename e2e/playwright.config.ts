import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: ['**/*.spec.ts'],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  use: {
    headless: true,
  },
})
