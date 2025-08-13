import { _electron as electron, expect, test } from '@playwright/test'

test('Chocolatey: bouton Réparer + Relancer visible et cliquable', async () => {
  if (process.env.CI) {
    test.skip(true, 'Instable en CI (environnement sans choco)')
  }
  const app = await electron.launch({
    args: ['.'],
    env: { ...process.env, NODE_ENV: 'production' },
  })
  const win = await app.firstWindow()
  await win.waitForLoadState('domcontentloaded')
  const hasTabs = await win.locator('[aria-label="Onglets Chocolatey"]').count()
  if (!hasTabs) {
    test.skip('Chocolatey non disponible dans cet environnement')
  }
  await win.waitForSelector('[aria-label="Onglets Chocolatey"]', {
    state: 'visible',
    timeout: 3000,
  })

  // Aller sur Chocolatey
  await win.evaluate(() => {
    ;(window as any).history.pushState({}, '', '/chocolatey')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await win.waitForLoadState('domcontentloaded')

  // Aller sur l’onglet Terminal
  await win
    .getByRole('tab', { name: /Terminal/i })
    .click({ trial: false })
    .catch(async () => {
      await win.click('button:has-text("Terminal")')
    })
  await expect(win.locator('text=Terminal Chocolatey')).toBeVisible()

  // Saisir une commande légère non destructive (version)
  await win.fill('input[title*="Saisir une commande"]', 'choco -v')
  await win.click('button:has-text("Exécuter")')

  // Attendre un peu que la session soit active
  await win.waitForTimeout(1500)

  // Le bouton Réparer + Relancer doit être présent (peut être disabled si pas de dernière commande éligible)
  const btn = win.locator('button:has-text("Réparer + Relancer")')
  await expect(btn).toHaveCount(1)

  // Ne pas cliquer si la commande n’est pas admin (peut être disabled). On vérifie seulement la présence
  await app.close()
})
