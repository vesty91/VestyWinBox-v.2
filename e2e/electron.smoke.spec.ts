import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'

// Smoke test: start Electron in production mode and ensure main window loads

test('Electron app launches and shows main window content', async () => {
  const electronApp = await electron.launch({
    args: ['.'],
    env: { ...process.env, NODE_ENV: 'production' },
  })

  const window = await electronApp.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  // Look for branding text present on dashboard
  const text = await window.textContent('body')
  expect(text || '').toContain('VestyWinBox')

  await electronApp.close()
})
