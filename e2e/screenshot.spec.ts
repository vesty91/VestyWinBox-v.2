import { _electron as electron, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const outDir = path.join(process.cwd(), 'assets', 'screens')

async function ensureDir(p: string) {
  try {
    fs.mkdirSync(p, { recursive: true })
  } catch {}
}

async function snap(win: any, name: string) {
  await ensureDir(outDir)
  const p = path.join(outDir, `${name}.png`)
  await win.screenshot({ path: p, fullPage: true })
}

test('Captures d’écran principales (Dashboard/Chocolatey/Converter/GodMode)', async () => {
  const app = await electron.launch({
    args: ['.'],
    env: { ...process.env, NODE_ENV: 'production' },
  })
  const win = await app.firstWindow()
  await win.waitForLoadState('domcontentloaded')

  // Dashboard / accueil
  await snap(win, 'dashboard')

  // Chocolatey
  await win.evaluate(() => {
    ;(window as any).history.pushState({}, '', '/chocolatey')
  })
  await win.waitForLoadState('domcontentloaded')
  await snap(win, 'chocolatey')

  // File Converter
  await win.evaluate(() => {
    ;(window as any).history.pushState({}, '', '/file-converter')
  })
  await win.waitForLoadState('domcontentloaded')
  await snap(win, 'converter')

  // God Mode
  await win.evaluate(() => {
    ;(window as any).history.pushState({}, '', '/godmode')
  })
  await win.waitForLoadState('domcontentloaded')
  await snap(win, 'godmode')

  await app.close()
})
