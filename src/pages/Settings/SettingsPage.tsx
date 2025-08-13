import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Button from '../../ui/components/Button'
import { t } from '../../i18n'
import { card, input } from '../../ui/styles/tokens'

type ThemeName = 'dark' | 'light' | 'gold' | 'neon' | 'custom'

type CustomTheme = {
  bgPrimary: string
  tileBg: string
  border: string
  textPrimary: string
  textMuted: string
  icon: string
  accentStart: string
  accentEnd: string
}

type Settings = {
  themeMode: 'fixed' | 'follow' | 'custom'
  themeFixed: ThemeName
  portableRoot?: string
  conversionsDir?: string
  lockSidebar: boolean
  customTheme: CustomTheme
  applyOnStartup?: boolean
}

const defaultCustom: CustomTheme = {
  bgPrimary: '#0f0f0f',
  tileBg: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.2)',
  textPrimary: '#ffffff',
  textMuted: 'rgba(255,255,255,0.6)',
  icon: '#ffffff',
  accentStart: '#8B5CF6',
  accentEnd: '#3B82F6',
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem('vw_settings')
      const base = raw
        ? JSON.parse(raw)
        : {
            themeMode: 'fixed',
            themeFixed: (localStorage.getItem('vwbox_theme') as ThemeName) || 'dark',
            lockSidebar: localStorage.getItem('vwbox_lock_sidebar') === '1',
          }
      const custom = JSON.parse(localStorage.getItem('vw_custom_theme') || 'null') || defaultCustom
      return {
        customTheme: custom,
        portableRoot: undefined,
        conversionsDir: undefined,
        applyOnStartup: true,
        ...base,
      }
    } catch {
      return {
        themeMode: 'fixed',
        themeFixed: 'dark',
        lockSidebar: false,
        customTheme: defaultCustom,
        applyOnStartup: true,
      }
    }
  })

  useEffect(() => {
    localStorage.setItem('vw_settings', JSON.stringify(settings))
  }, [settings])

  const applyCustomTheme = (ct: CustomTheme) => {
    const elId = 'vw-custom-theme'
    const css = `:root[data-theme="custom"]{--bg-primary:${ct.bgPrimary};--header-bg:${ct.tileBg};--sidebar-bg:${ct.tileBg};--tile-bg:${ct.tileBg};--border:${ct.border};--border-soft:${ct.border};--text-primary:${ct.textPrimary};--text-muted:${ct.textMuted};--icon:${ct.icon};--accent:linear-gradient(135deg, ${ct.accentStart} 0%, ${ct.accentEnd} 100%);--bg-decor:radial-gradient(800px 400px at 20% 0%, ${ct.accentStart}2B, transparent 60%),radial-gradient(700px 380px at 80% 20%, ${ct.accentEnd}24, transparent 60%),radial-gradient(600px 320px at 50% 100%, ${ct.accentStart}1F, transparent 60%);}`
    let node = document.getElementById(elId) as HTMLStyleElement | null
    if (!node) {
      node = document.createElement('style')
      node.id = elId
      document.head.appendChild(node)
    }
    node.textContent = css
  }

  useEffect(() => {
    if (settings.themeMode === 'custom') {
      applyCustomTheme(settings.customTheme)
      document.documentElement.setAttribute('data-theme', 'custom')
      localStorage.setItem('vwbox_theme', 'custom')
      localStorage.setItem('vw_custom_theme', JSON.stringify(settings.customTheme))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.themeMode])

  useEffect(() => {
    if (settings.themeMode === 'custom') {
      applyCustomTheme(settings.customTheme)
      localStorage.setItem('vw_custom_theme', JSON.stringify(settings.customTheme))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.customTheme])

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const saveToApp = async () => {
    // Appliquer thème
    if (settings.themeMode === 'custom') {
      applyCustomTheme(settings.customTheme)
      document.documentElement.setAttribute('data-theme', 'custom')
      localStorage.setItem('vwbox_theme', 'custom')
      localStorage.setItem('vw_custom_theme', JSON.stringify(settings.customTheme))
    } else {
      const themeToApply =
        settings.themeMode === 'follow' ? detectWindowsTheme() : settings.themeFixed
      document.documentElement.setAttribute('data-theme', themeToApply)
      localStorage.setItem('vwbox_theme', themeToApply)
    }
    // Sidebar lock
    localStorage.setItem('vwbox_lock_sidebar', settings.lockSidebar ? '1' : '0')
    // Chemins
    if (settings.portableRoot && window.electronAPI?.setPortableRootDir) {
      await window.electronAPI.setPortableRootDir(settings.portableRoot)
    }
    if (settings.conversionsDir) {
      localStorage.setItem('vw_conversions_dir', settings.conversionsDir)
    }
  }

  const detectWindowsTheme = (): ThemeName => {
    try {
      const prefersDark =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      return prefersDark ? ('dark' as ThemeName) : ('light' as ThemeName)
    } catch {
      return 'dark'
    }
  }

  const pickPortableRoot = async () => {
    const def = await window.electronAPI.getPortableRootDir().catch(() => null)
    const chosen = await window.electronAPI.chooseDirectory({
      title: 'Choisir le dossier PortableApps',
      defaultPath: def || undefined,
    })
    if (chosen) setSettings((s) => ({ ...s, portableRoot: chosen }))
  }

  const pickConversionsDir = async () => {
    const chosen = await window.electronAPI.selectOutputDir()
    if (chosen) setSettings((s) => ({ ...s, conversionsDir: chosen }))
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ marginBottom: 24 }}
      >
        <h1>{t('settings_title') || 'Paramètres'}</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: -8 }}>
          {t('settings_subtitle') || 'Thèmes, chemins par défaut et préférences'}
        </p>
      </motion.div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 16,
        }}
      >
        <section style={{ ...card.base }}>
          <h3 style={{ marginTop: 0 }}>{t('settings_theme') || 'Thème'}</h3>
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                aria-label="Mode thème: fixe"
                type="radio"
                checked={settings.themeMode === 'fixed'}
                onChange={() => setSettings((s) => ({ ...s, themeMode: 'fixed' }))}
              />{' '}
              {t('theme_fixed') || 'Fixe'}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                aria-label="Mode thème: suivre Windows"
                type="radio"
                checked={settings.themeMode === 'follow'}
                onChange={() => setSettings((s) => ({ ...s, themeMode: 'follow' }))}
              />{' '}
              {t('theme_follow') || 'Suivre Windows'}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                aria-label="Mode thème: personnalisé"
                type="radio"
                checked={settings.themeMode === 'custom'}
                onChange={() => setSettings((s) => ({ ...s, themeMode: 'custom' }))}
              />{' '}
              {t('theme_custom') || 'Custom'}
            </label>
          </div>
          {settings.themeMode === 'fixed' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['dark', 'light', 'gold', 'neon'] as ThemeName[]).map((t) => (
                <Button
                  key={t}
                  variant={settings.themeFixed === t ? 'primary' : 'outline'}
                  onClick={() => setSettings((s) => ({ ...s, themeFixed: t }))}
                >
                  {t}
                </Button>
              ))}
            </div>
          )}
          {settings.themeMode === 'custom' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 10,
                marginTop: 12,
              }}
            >
              {(
                [
                  { key: 'bgPrimary', label: t('theme_bg') || 'Fond' },
                  { key: 'tileBg', label: t('theme_cards') || 'Cartes' },
                  { key: 'border', label: t('theme_border') || 'Bordure' },
                  { key: 'textPrimary', label: t('theme_text') || 'Texte' },
                  { key: 'textMuted', label: t('theme_text_muted') || 'Texte secondaire' },
                  { key: 'icon', label: t('theme_icons') || 'Icônes' },
                ] as Array<{ key: keyof CustomTheme; label: string }>
              ).map((f) => (
                <div
                  key={f.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1fr 44px',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <label style={{ color: 'var(--text-muted)', fontSize: 13 }}>{f.label}</label>
                  <input
                    aria-label={`Valeur ${f.label}`}
                    type="text"
                    value={settings.customTheme[f.key] as string}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        customTheme: { ...s.customTheme, [f.key]: e.target.value },
                      }))
                    }
                    placeholder="#FFFFFF ou rgba()"
                    style={{ ...input.base }}
                  />
                  <input
                    aria-label={`Couleur ${f.label}`}
                    type="color"
                    value={
                      /^#/.test(String(settings.customTheme[f.key]))
                        ? String(settings.customTheme[f.key])
                        : '#000000'
                    }
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        customTheme: { ...s.customTheme, [f.key]: e.target.value },
                      }))
                    }
                    title="Sélecteur de couleur"
                  />
                </div>
              ))}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr 44px',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <label style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  {t('theme_accent_start') || 'Accent début'}
                </label>
                <input
                  aria-label="Valeur accent début"
                  type="text"
                  value={settings.customTheme.accentStart}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      customTheme: { ...s.customTheme, accentStart: e.target.value },
                    }))
                  }
                  placeholder="#8B5CF6"
                  style={{ ...input.base }}
                />
                <input
                  aria-label="Couleur accent début"
                  type="color"
                  value={
                    /^#/.test(settings.customTheme.accentStart)
                      ? settings.customTheme.accentStart
                      : '#8B5CF6'
                  }
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      customTheme: { ...s.customTheme, accentStart: e.target.value },
                    }))
                  }
                  title={t('pick_color_accent_start') || 'Choisir la couleur accent début'}
                />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr 44px',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <label style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  {t('theme_accent_end') || 'Accent fin'}
                </label>
                <input
                  aria-label="Valeur accent fin"
                  type="text"
                  value={settings.customTheme.accentEnd}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      customTheme: { ...s.customTheme, accentEnd: e.target.value },
                    }))
                  }
                  placeholder="#3B82F6"
                  style={{ ...input.base }}
                />
                <input
                  aria-label="Couleur accent fin"
                  type="color"
                  value={
                    /^#/.test(settings.customTheme.accentEnd)
                      ? settings.customTheme.accentEnd
                      : '#3B82F6'
                  }
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      customTheme: { ...s.customTheme, accentEnd: e.target.value },
                    }))
                  }
                  title={t('pick_color_accent_end') || 'Choisir la couleur accent fin'}
                />
              </div>
              <div
                style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  gap: 8,
                  marginTop: 8,
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSettings((s) => ({ ...s, customTheme: defaultCustom }))
                  }}
                >
                  {t('reset') || 'Réinitialiser'}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    applyCustomTheme(settings.customTheme)
                    document.documentElement.setAttribute('data-theme', 'custom')
                    localStorage.setItem('vw_custom_theme', JSON.stringify(settings.customTheme))
                    localStorage.setItem('vwbox_theme', 'custom')
                  }}
                >
                  {t('preview') || 'Prévisualiser'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(settings.customTheme, null, 2)], {
                      type: 'application/json',
                    })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'vw_custom_theme.json'
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                    URL.revokeObjectURL(url)
                  }}
                >
                  {t('export_preset') || 'Exporter le preset'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  style={{ display: 'none' }}
                  title="Importer un preset JSON"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      try {
                        const obj = JSON.parse(String(reader.result))
                        const merged: CustomTheme = { ...settings.customTheme, ...obj }
                        setSettings((s) => ({ ...s, customTheme: merged }))
                      } catch {}
                    }
                    reader.readAsText(file)
                    e.currentTarget.value = ''
                  }}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  {t('import_preset') || 'Importer un preset'}
                </Button>
              </div>
            </div>
          )}
        </section>

        <section style={{ ...card.base }}>
          <h3 style={{ marginTop: 0 }}>{t('default_paths') || 'Chemins par défaut'}</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>PortableApps Root</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  aria-label="Chemin PortableApps"
                  value={settings.portableRoot || ''}
                  onChange={(e) => setSettings((s) => ({ ...s, portableRoot: e.target.value }))}
                  placeholder="C:\\PortableApps"
                  style={{ ...input.base, flex: 1 }}
                />
                <Button size="sm" variant="outline" onClick={pickPortableRoot}>
                  {t('browse') || 'Parcourir…'}
                </Button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {t('conversions_dir') || 'Dossier de conversions'}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  aria-label="Dossier de conversions"
                  value={settings.conversionsDir || ''}
                  onChange={(e) => setSettings((s) => ({ ...s, conversionsDir: e.target.value }))}
                  placeholder="Downloads\\VestyWinBox\\Converted"
                  style={{ ...input.base, flex: 1 }}
                />
                <Button size="sm" variant="outline" onClick={pickConversionsDir}>
                  {t('browse') || 'Parcourir…'}
                </Button>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                aria-label="Appliquer les chemins au démarrage"
                type="checkbox"
                checked={!!settings.applyOnStartup}
                onChange={(e) => setSettings((s) => ({ ...s, applyOnStartup: e.target.checked }))}
              />
              {t('apply_paths_on_startup') || 'Appliquer ces chemins au démarrage (si définis)'}
            </label>
          </div>
        </section>

        <section style={{ ...card.base }}>
          <h3 style={{ marginTop: 0 }}>{t('preferences') || 'Préférences'}</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              aria-label="Verrouiller la barre latérale"
              type="checkbox"
              checked={settings.lockSidebar}
              onChange={(e) => setSettings((s) => ({ ...s, lockSidebar: e.target.checked }))}
            />
            {t('lock_sidebar') || 'Verrouiller la barre latérale'}
          </label>
        </section>
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <Button variant="primary" onClick={saveToApp}>
          {t('save_and_apply') || 'Enregistrer et appliquer'}
        </Button>
      </div>
    </div>
  )
}

export default SettingsPage
