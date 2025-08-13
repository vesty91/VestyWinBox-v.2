import { describe, it, expect, beforeEach } from 'vitest'
import { getLang, setLang, t } from './i18n'

describe('i18n', () => {
  beforeEach(() => {
    try {
      localStorage.removeItem('vw_lang')
    } catch {}
  })

  it('defaults to fr', () => {
    expect(getLang()).toBe('fr')
  })

  it('setLang persists and t() uses it', () => {
    setLang('en')
    expect(getLang()).toBe('en')
    expect(t('footer_version_prefix')).toBe('VestyWinBox')
  })

  it('t() falls back to fr or key', () => {
    setLang('en')
    // key that exists in fr and en
    expect(t('search')).toBeDefined()
    // non-existent key returns key
    expect(t('__missing_key__')).toBe('__missing_key__')
  })
})
