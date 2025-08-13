import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  Filter,
  Info,
  ListChecks,
  Package,
  RefreshCw,
  Search,
  Shield,
  Terminal,
  Trash2,
  X,
} from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { t } from '../../i18n'
import Button from '../../ui/components/Button'
import { pushToast } from '../../ui/components/Toaster'
import { card, input as inputTokens, select as selectTokens, surface } from '../../ui/styles/tokens'

interface ChocoPkg {
  name: string
  version: string
}
interface OutdatedPkg {
  name: string
  current: string
  available: string
}

type TabKey = 'search' | 'installed' | 'outdated' | 'terminal'

const SectionCard: React.FC<{
  title: string
  right?: React.ReactNode
  children: React.ReactNode
}> = ({ title, right, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    style={{ ...card.base }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}
    >
      <strong style={{ fontSize: 16 }}>{title}</strong>
      <div>{right}</div>
    </div>
    {children}
  </motion.div>
)

const TabButton: React.FC<{
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
  badge?: string | number
}> = ({ active, onClick, icon: Icon, label, badge }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 14px',
      borderRadius: 12,
      cursor: 'pointer',
      border: active ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.15)',
      background: active
        ? 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(124,58,237,0.2))'
        : 'rgba(255,255,255,0.06)',
      color: '#fff',
    }}
    aria-label={`Onglet ${label}`}
  >
    <Icon size={16} />
    <span style={{ fontWeight: 700 }}>{label}</span>
    {badge !== undefined && (
      <span
        style={{
          fontSize: 12,
          padding: '2px 6px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.18)',
        }}
      >
        {badge}
      </span>
    )}
  </button>
)

const ChocolateyPage: React.FC = () => {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('search')
  const [pendingAutorun, setPendingAutorun] = useState<string[] | null>(null)

  // Recherche
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<ChocoPkg[]>([])
  const [searchSort, setSearchSort] = useState<'az' | 'za'>('az')
  const [page, setPage] = useState(1)
  const pageSize = 15
  const [onlyExact, setOnlyExact] = useState(false)
  const [excludeVariants, setExcludeVariants] = useState(true)
  const [filterMaintainer, setFilterMaintainer] = useState('')
  const [maintainerFiltering, setMaintainerFiltering] = useState(false)
  const [onlyPrerelease, setOnlyPrerelease] = useState(false)

  // Installés / obsolètes
  const [installed, setInstalled] = useState<ChocoPkg[]>([])
  const [outdated, setOutdated] = useState<OutdatedPkg[]>([])
  const [showOnlyOutdated, setShowOnlyOutdated] = useState(false)
  const [sortInstalled, setSortInstalled] = useState<'name' | 'update'>('name')

  // Busy state
  const [busy, setBusy] = useState<string | null>(null)

  // Info paquet
  const [pkgInfo, setPkgInfo] = useState<{ name: string; content: string } | null>(null)

  // Terminal
  const [terminalLines, setTerminalLines] = useState<string[]>([])
  const [termSession, setTermSession] = useState<string>('')
  const [command, setCommand] = useState('')
  const [historyCmd, setHistoryCmd] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('vw_choco_history') || '[]')
    } catch {
      return []
    }
  })
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [startedAt, setStartedAt] = useState<number>(0)
  const [elapsed, setElapsed] = useState<number>(0)
  const [lastArgs, setLastArgs] = useState<string[] | null>(null)
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('vw_choco_favorites') || '[]')
    } catch {
      return []
    }
  })

  // Pré-remplissage terminal depuis d'autres pages (ex: Convertisseur)
  useEffect(() => {
    try {
      const pre = localStorage.getItem('vw_choco_prefill')
      if (pre && pre.trim()) {
        localStorage.removeItem('vw_choco_prefill')
        setActiveTab('terminal')
        setCommand(pre)
        // si autorun demandé, préparer l’exécution quand le terminal sera prêt
        const autorun = localStorage.getItem('vw_choco_autorun')
        if (autorun === '1') {
          const raw = pre.trim()
          const withoutPrefix = raw.startsWith('choco ') ? raw.slice(6) : raw
          const args = withoutPrefix.split(' ').filter(Boolean)
          setPendingAutorun(args)
        }
      }
    } catch {}
  }, [])

  // Charger les filtres depuis le stockage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('vw_choco_filters')
      if (raw) {
        const f = JSON.parse(raw)
        if (typeof f.onlyExact === 'boolean') setOnlyExact(f.onlyExact)
        if (typeof f.excludeVariants === 'boolean') setExcludeVariants(f.excludeVariants)
      }
    } catch {}
  }, [])

  // Persister les filtres
  useEffect(() => {
    try {
      localStorage.setItem('vw_choco_filters', JSON.stringify({ onlyExact, excludeVariants }))
    } catch {}
  }, [onlyExact, excludeVariants])

  const saveHistory = (cmd: string) => {
    if (!cmd.trim()) return
    const list = [cmd.trim(), ...historyCmd.filter((c) => c !== cmd.trim())].slice(0, 10)
    setHistoryCmd(list)
    localStorage.setItem('vw_choco_history', JSON.stringify(list))
    setHistoryIndex(-1)
  }

  const addFavorite = (cmd: string) => {
    const trimmed = cmd.trim()
    if (!trimmed) return
    const list = [trimmed, ...favorites.filter((f) => f !== trimmed)].slice(0, 10)
    setFavorites(list)
    localStorage.setItem('vw_choco_favorites', JSON.stringify(list))
  }

  const removeFavorite = (cmd: string) => {
    const list = favorites.filter((f) => f !== cmd)
    setFavorites(list)
    localStorage.setItem('vw_choco_favorites', JSON.stringify(list))
  }

  const loadStatus = async () => {
    const ok = await window.electronAPI.chocoIsAvailable()
    setIsAvailable(ok)
    if (ok) {
      const [loc, od] = await Promise.all([
        window.electronAPI.chocoListLocal(),
        window.electronAPI.chocoOutdated(),
      ])
      setInstalled(loc)
      setOutdated(od)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  useEffect(() => {
    const sid = Math.random().toString(36).slice(2)
    setTermSession(sid)
    // Charger logs précédents éventuels
    try {
      const prev = localStorage.getItem(`vw_choco_logs_${sid}`)
      if (prev) setTerminalLines(prev.split('\n'))
    } catch {}
    const onLog = (msg: any) => {
      if (msg?.sessionId !== sid) return
      setTerminalLines((prev) => [...prev, msg.type === 'stderr' ? `[ERR] ${msg.data}` : msg.data])
    }
    const onExit = (msg: any) => {
      if (msg?.sessionId !== sid) return
      setTerminalLines((prev) => [...prev, `\n— Processus terminé (code ${msg.code}) —\n`])
      setIsRunning(false)
    }
    window.electronAPI.onChocoLog(onLog)
    window.electronAPI.onChocoExit(onExit)
    return () => {
      try {
        window.electronAPI.offChocoLog(onLog)
      } catch {}
      try {
        window.electronAPI.offChocoExit(onExit)
      } catch {}
    }
  }, [])

  // Persister les logs à chaque changement
  useEffect(() => {
    if (!termSession) return
    try {
      localStorage.setItem(`vw_choco_logs_${termSession}`, terminalLines.join(''))
    } catch {}
  }, [terminalLines, termSession])

  useEffect(() => {
    let t: any
    if (isRunning && startedAt) {
      t = setInterval(() => setElapsed(Date.now() - startedAt), 1000)
    } else {
      setElapsed(0)
    }
    return () => {
      if (t) clearInterval(t)
    }
  }, [isRunning, startedAt])

  // Actions choco de base
  const doInstallChoco = async () => {
    setBusy('installChoco')
    const ok = await window.electronAPI.installChocolatey()
    setBusy(null)
    await loadStatus()
    pushToast({
      kind: ok ? 'success' : 'error',
      text: ok ? 'Chocolatey installé avec succès.' : "Échec d'installation de Chocolatey.",
    })
  }

  const doSearch = useCallback(async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await window.electronAPI.chocoSearch(query.trim())
      let out = res
      // Filtre pré-release simple sur la version
      if (onlyPrerelease) {
        const re = /(alpha|beta|rc|preview|nightly|pre)/i
        out = out.filter((p) => re.test(p.version) || /-/.test(p.version))
      }
      // Filtre mainteneur (nécessite choco info)
      if (filterMaintainer.trim()) {
        setMaintainerFiltering(true)
        const limited = out.slice(0, 60) // éviter trop d'appels
        const infos = await Promise.allSettled(
          limited.map((p) => window.electronAPI.chocoInfo(p.name)),
        )
        const keep = new Set<string>()
        const needle = filterMaintainer.trim().toLowerCase()
        infos.forEach((r, idx) => {
          if (r.status === 'fulfilled' && typeof r.value === 'string') {
            const m = (r.value.match(/^Maintainer[s]?:\s*(.*)$/im) || [])[1] || ''
            if (m.toLowerCase().includes(needle)) keep.add(limited[idx].name)
          }
        })
        out = out.filter((p) => keep.has(p.name))
        setMaintainerFiltering(false)
      }
      setSearchResults(out)
    } catch (e) {
      setSearchResults([])
    } finally {
      setSearching(false)
      setPage(1)
    }
  }, [query, onlyPrerelease, filterMaintainer])

  // Debounce automatique sur la recherche
  useEffect(() => {
    const id = setTimeout(() => {
      if (query.trim().length >= 3) doSearch()
    }, 350)
    return () => clearTimeout(id)
  }, [query, doSearch])

  const install = async (name: string) => {
    setBusy(`install:${name}`)
    const ok = await window.electronAPI.chocoInstall(name)
    setBusy(null)
    await loadStatus()
    pushToast({
      kind: ok ? 'success' : 'error',
      text: ok ? `${name} installé.` : `Échec installation ${name}.`,
    })
  }

  const upgrade = async (name: string) => {
    setBusy(`upgrade:${name}`)
    const ok = await window.electronAPI.chocoUpgrade(name)
    setBusy(null)
    await loadStatus()
    pushToast({
      kind: ok ? 'success' : 'error',
      text: ok ? `${name} mis à jour.` : `Échec mise à jour ${name}.`,
    })
  }

  const uninstall = async (name: string) => {
    if (!confirm(`Désinstaller ${name} ?`)) return
    setBusy(`uninstall:${name}`)
    const ok = await window.electronAPI.chocoUninstall(name)
    setBusy(null)
    await loadStatus()
    pushToast({
      kind: ok ? 'success' : 'error',
      text: ok ? `${name} désinstallé.` : `Échec désinstallation ${name}.`,
    })
  }

  const bulkUpgrade = async () => {
    if (!outdated.length) return
    // bascule vers terminal et lance upgrade all pour une sortie robuste
    setActiveTab('terminal')
    await runChocoSmart(['upgrade', 'all', '-y'])
  }

  const openInfo = async (name: string) => {
    setBusy(`info:${name}`)
    const content = await window.electronAPI.chocoInfo(name)
    setBusy(null)
    setPkgInfo({ name, content })
  }

  // Terminal helpers
  const requiresAdmin = (args: string[]) => {
    const adminOps = new Set([
      'install',
      'upgrade',
      'uninstall',
      'pin',
      'feature',
      'features',
      'source',
      'sources',
      'config',
    ])
    const first = (args[0] || '').toLowerCase()
    return adminOps.has(first)
  }

  const runChoco = useCallback(
    async (args: string[]) => {
      if (!termSession) return
      setTerminalLines((prev) => [...prev, `> choco ${args.join(' ')}\n`])
      setIsRunning(true)
      setStartedAt(Date.now())
      setLastArgs(args)
      await window.electronAPI.chocoRun(args, termSession)
    },
    [termSession],
  )

  const runChocoSmart = useCallback(
    async (args: string[]) => {
      if (!termSession) return
      if ((window.electronAPI as any)?.chocoRunElevated && requiresAdmin(args)) {
        setTerminalLines((prev) => [...prev, `> [ADMIN] choco ${args.join(' ')}\n`])
        setIsRunning(true)
        setStartedAt(Date.now())
        setLastArgs(args)
        await (window.electronAPI as any).chocoRunElevated(args, termSession)
        return
      }
      await runChoco(args)
    },
    [termSession, runChoco],
  )

  // Déclenche l’auto‑run dès que la session terminal est prête et l’onglet actif
  useEffect(() => {
    if (activeTab !== 'terminal') return
    if (!termSession) return
    if (!pendingAutorun || isRunning) return
    ;(async () => {
      setCommand('')
      await runChocoSmart(pendingAutorun)
      setPendingAutorun(null)
      try {
        localStorage.removeItem('vw_choco_autorun')
      } catch {}
    })()
  }, [activeTab, termSession, pendingAutorun, isRunning, runChocoSmart])

  const runCustomCommand = async () => {
    const raw = command.trim()
    if (!raw) return
    const withoutPrefix = raw.startsWith('choco ') ? raw.slice(6) : raw
    const args = withoutPrefix.split(' ').filter(Boolean)
    saveHistory(raw)
    setCommand('')
    await runChocoSmart(args)
  }

  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(terminalLines.join(''))
    } catch {}
  }

  const exportLogs = () => {
    ;(async () => {
      try {
        const p = (window as any).electronAPI?.chocoGetLogFile
          ? await (window as any).electronAPI.chocoGetLogFile(termSession)
          : null
        if (p && typeof p === 'string') {
          // ouvrir le dossier contenant le fichier pour que l'utilisateur le récupère
          try {
            const dir = p.replace(/\\[^\\]*$/, '')
            await (window as any).electronAPI.openFolder(dir)
            return
          } catch {}
        }
      } catch {}
      const blob = new Blob([terminalLines.join('')], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `choco-log-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    })()
  }

  const variantRegex = useMemo(
    () =>
      /(\.|-)(install|portable|commandline|cli|extension|extensions|nightly|beta|alpha)\b|skin/i,
    [],
  )

  // Dérivés
  const sortedSearch = useMemo(() => {
    let base = [...searchResults]
    if (query.trim()) {
      if (onlyExact) {
        const q = query.trim().toLowerCase()
        base = base.filter((p) => p.name.toLowerCase() === q)
      }
      if (excludeVariants) {
        base = base.filter((p) => !variantRegex.test(p.name))
      }
      if (onlyPrerelease) {
        const re = /(alpha|beta|rc|preview|nightly|pre)/i
        base = base.filter((p) => re.test(p.version) || /-/.test(p.version))
      }
    }
    base.sort((a, b) =>
      searchSort === 'az' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
    )
    return base
  }, [searchResults, searchSort, onlyExact, excludeVariants, query, variantRegex, onlyPrerelease])
  const paginatedSearch = useMemo(
    () => sortedSearch.slice((page - 1) * pageSize, page * pageSize),
    [sortedSearch, page],
  )
  const filteredInstalled = useMemo(
    () =>
      installed.filter(
        (p) =>
          !showOnlyOutdated || outdated.some((o) => o.name.toLowerCase() === p.name.toLowerCase()),
      ),
    [installed, showOnlyOutdated, outdated],
  )
  const sortedInstalled = useMemo(() => {
    if (sortInstalled === 'name')
      return [...filteredInstalled].sort((a, b) => a.name.localeCompare(b.name))
    // 'update' → d'abord ceux avec update
    return [...filteredInstalled].sort((a, b) => {
      const aHas = outdated.some((o) => o.name.toLowerCase() === a.name.toLowerCase())
      const bHas = outdated.some((o) => o.name.toLowerCase() === b.name.toLowerCase())
      return Number(bHas) - Number(aHas) || a.name.localeCompare(b.name)
    })
  }, [filteredInstalled, sortInstalled, outdated])

  // Parsing info paquet (enrichi)
  const parsedInfo = useMemo(() => {
    if (!pkgInfo?.content) return null
    const lines = pkgInfo.content.split(/\r?\n/)
    const map: Record<string, string> = {}
    lines.forEach((l) => {
      const m = l.match(/^([^:]+):\s*(.*)$/)
      if (m) map[m[1].trim()] = m[2].trim()
    })
    const homepage = map['ProjectUrl'] || map['Project URL'] || map['Homepage']
    const description = map['Description'] || lines.slice(0, 12).join('\n')
    const maintainer = map['Maintainer'] || map['Maintainers'] || map['Author']
    const license = map['License'] || map['LicenseUrl'] || map['License Url']
    const published = map['Published'] || map['Last Updated'] || map['Updated'] || map['Date']
    const dependencies = map['Dependencies']
    const docs = map['DocsUrl'] || map['Documentation']
    const bugs = map['BugTrackerUrl'] || map['Bugs'] || map['Issue Tracker']
    const releases = map['ReleaseNotes'] || map['Release Notes']
    const source = map['ProjectSourceUrl'] || map['PackageSourceUrl']
    const tags = map['Tags'] || map['Tag']
    return {
      homepage,
      description,
      fields: map,
      maintainer,
      license,
      published,
      dependencies,
      docs,
      bugs,
      releases,
      source,
      tags,
    }
  }, [pkgInfo])

  const [infoTab, setInfoTab] = useState<'overview' | 'deps' | 'versions'>('overview')
  const [versions, setVersions] = useState<string[] | null>(null)
  useEffect(() => {
    ;(async () => {
      if (!pkgInfo?.name || !window.electronAPI?.chocoListVersions) {
        setVersions(null)
        return
      }
      const v = await window.electronAPI.chocoListVersions(pkgInfo.name)
      setVersions(Array.isArray(v) ? v : [])
    })()
  }, [pkgInfo?.name])

  const repairChocolatey = async () => {
    try {
      setActiveTab('terminal')
      pushToast?.({ kind: 'info', text: 'Activation de la source…' })
      await runChocoSmart(['source', 'enable', '-n=chocolatey'])
      pushToast?.({ kind: 'info', text: 'Mise à jour de Chocolatey…' })
      await runChocoSmart(['upgrade', 'chocolatey', '-y', '--no-progress'])
      pushToast?.({ kind: 'info', text: 'Installation de chocolatey-core.extension…' })
      await runChocoSmart(['install', 'chocolatey-core.extension', '-y', '--no-progress'])
      pushToast?.({ kind: 'info', text: 'Nettoyage des caches…' })
      await runChocoSmart(['clean', '-y'])
      await runChocoSmart(['cache', 'remove', '--all'])
      pushToast?.({ kind: 'info', text: 'Suppression des anciens KB (si présents)…' })
      await runChocoSmart(['uninstall', 'KB2919355', 'KB2919442', '-y', '--force', '--no-progress'])
      pushToast?.({ kind: 'success', text: 'Réparation terminée' })
    } catch {}
  }

  const diagnoseChocolatey = async () => {
    setActiveTab('terminal')
    pushToast({ kind: 'info', text: 'Diagnostic Chocolatey…' })
    await runChoco(['-v'])
    await runChoco(['source', 'list', '-r'])
    await runChoco(['list', 'chocolatey-core.extension', '--exact'])
  }

  const canRetry = useMemo(() => {
    const first = lastArgs && lastArgs[0] ? lastArgs[0].toLowerCase() : ''
    return !!lastArgs && (first === 'install' || first === 'upgrade' || first === 'uninstall')
  }, [lastArgs])

  const repairAndRetry = async () => {
    try {
      await repairChocolatey()
      if (lastArgs) {
        pushToast?.({ kind: 'info', text: 'Relance de la dernière commande…' })
        await runChocoSmart(lastArgs)
      }
    } catch {}
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* En-tête */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ marginBottom: 20 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'var(--tile-bg)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Package size={34} color="var(--icon)" />
          </div>
          <div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 800,
                margin: 0,
                background: 'linear-gradient(135deg,#8B5CF6 0%, #7C3AED 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('choco_title')}
            </h1>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              {t('choco_subtitle') || 'Gestionnaire de paquets Windows avec terminal intégré'}
            </p>
          </div>
        </div>

        {isAvailable === false && (
          <div
            style={{
              ...surface.muted,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Shield size={20} color="#F59E0B" />
              <div>
                <div style={{ fontWeight: 700 }}>
                  {t('choco_not_installed') || "Chocolatey n'est pas installé"}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                  {t('choco_install_hint') || "Cliquez pour l'installer en mode administrateur"}
                </div>
              </div>
            </div>
            <Button onClick={doInstallChoco} disabled={busy === 'installChoco'} variant="primary">
              {busy === 'installChoco'
                ? t('installing') || 'Installation…'
                : t('install_chocolatey') || 'Installer Chocolatey'}
            </Button>
          </div>
        )}
        {isAvailable && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Button onClick={repairChocolatey} variant="outline" title={t('repair_choco')}>
              {t('repair_choco')}
            </Button>
            <Button onClick={diagnoseChocolatey} variant="outline" title={t('diagnostic_choco')}>
              {t('diagnostic') || 'Diagnostic'}
            </Button>
          </div>
        )}
      </motion.div>

      {/* Onglets */}
      {isAvailable && (
        <div
          role="tablist"
          aria-label="Onglets Chocolatey"
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}
        >
          <TabButton
            active={activeTab === 'search'}
            onClick={() => setActiveTab('search')}
            icon={Search}
            label={t('tab_search') || 'Recherche'}
            badge={searchResults.length}
          />
          <TabButton
            active={activeTab === 'installed'}
            onClick={() => setActiveTab('installed')}
            icon={ListChecks}
            label={t('tab_installed') || 'Installés'}
            badge={installed.length}
          />
          <TabButton
            active={activeTab === 'outdated'}
            onClick={() => setActiveTab('outdated')}
            icon={Clock3}
            label={t('tab_outdated') || 'Obsolètes'}
            badge={outdated.length}
          />
          <TabButton
            active={activeTab === 'terminal'}
            onClick={() => setActiveTab('terminal')}
            icon={Terminal}
            label={t('tab_terminal') || 'Terminal'}
          />
        </div>
      )}

      {/* Contenu des onglets */}
      {isAvailable && (
        <>
          <AnimatePresence mode="sync">
            {activeTab === 'search' && (
              <motion.div
                key="tab-search"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <SectionCard
                  title={t('search_packages')}
                  right={
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select
                        value={searchSort}
                        onChange={(e) => setSearchSort(e.target.value as any)}
                        title="Tri"
                        style={{ ...selectTokens.base }}
                      >
                        <option value="az">Nom A→Z</option>
                        <option value="za">Nom Z→A</option>
                      </select>
                      <Button
                        onClick={doSearch}
                        disabled={searching || maintainerFiltering}
                        variant="ghost"
                        style={{
                          background: 'linear-gradient(135deg,#3B82F6 0%, #2563EB 100%)',
                          border: 'none',
                        }}
                      >
                        {searching || maintainerFiltering
                          ? t('searching') || 'Recherche…'
                          : t('search') || 'Rechercher'}
                      </Button>
                    </div>
                  }
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search
                        size={18}
                        color="var(--text-muted)"
                        style={{
                          position: 'absolute',
                          left: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                      />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('search_packages')}
                        style={{ ...inputTokens.base, width: '100%', paddingLeft: 36 }}
                        aria-label={t('search_packages')}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 16,
                      alignItems: 'center',
                      margin: '-4px 0 12px 0',
                      color: 'var(--text-muted)',
                      fontSize: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        aria-label={t('exact_match') || 'Correspondance exacte'}
                        type="checkbox"
                        checked={onlyExact}
                        onChange={(e) => setOnlyExact(e.target.checked)}
                      />
                      {t('exact_match') || 'Exact (id exact)'}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        aria-label={t('hide_variants') || 'Masquer les variantes'}
                        type="checkbox"
                        checked={excludeVariants}
                        onChange={(e) => setExcludeVariants(e.target.checked)}
                      />
                      {t('hide_variants_desc') ||
                        'Masquer variantes (.install, .portable, .nightly, skins)'}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        aria-label={t('only_prerelease') || 'Inclure pré‑releases seulement'}
                        type="checkbox"
                        checked={onlyPrerelease}
                        onChange={(e) => setOnlyPrerelease(e.target.checked)}
                      />
                      {t('only_prerelease') || 'Pré‑release seulement'}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{t('maintainer') || 'Mainteneur'}</span>
                      <input
                        aria-label={t('filter_by_maintainer') || 'Filtrer par mainteneur'}
                        value={filterMaintainer}
                        onChange={(e) => setFilterMaintainer(e.target.value)}
                        placeholder={t('maintainer_placeholder') || 'ex: Microsoft'}
                        style={{ ...inputTokens.base }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={doSearch}
                        disabled={searching || maintainerFiltering}
                      >
                        {t('apply')}
                      </Button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {searchResults.length} {t('results')}
                    </span>
                    {searchResults.length > pageSize && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPage(Math.max(1, page - 1))}
                          title="Page précédente"
                        >
                          <ChevronLeft size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setPage(Math.min(Math.ceil(searchResults.length / pageSize), page + 1))
                          }
                          title="Page suivante"
                        >
                          <ChevronRight size={16} />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {paginatedSearch.map((p) => (
                      <div
                        key={p.name}
                        style={{
                          ...surface.muted,
                          padding: 14,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                              }}
                            >
                              {p.name}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openInfo(p.name)}
                                title={t('details') || 'Détails'}
                              >
                                <Info size={14} />
                              </Button>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              v{p.version}
                            </div>
                          </div>
                          <Button
                            onClick={() => install(p.name)}
                            disabled={busy === `install:${p.name}`}
                            variant="primary"
                            size="sm"
                            leftIcon={<Download size={16} />}
                          >
                            {t('install') || 'Installer'}
                          </Button>
                        </div>
                      </div>
                    ))}
                    {!paginatedSearch.length && (
                      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                        {t('none') || 'Aucun résultat'}
                      </div>
                    )}
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {activeTab === 'installed' && (
              <motion.div
                key="tab-installed"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <SectionCard
                  title={t('installed_packages')}
                  right={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          color: 'var(--text-muted)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={showOnlyOutdated}
                          onChange={(e) => setShowOnlyOutdated(e.target.checked)}
                        />
                        {t('updates_only') || 'Mises à jour seulement'}
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Filter size={14} color="var(--text-muted)" />
                        <select
                          value={sortInstalled}
                          onChange={(e) => setSortInstalled(e.target.value as any)}
                          aria-label="Trier les paquets installés"
                          title="Trier les paquets installés"
                          style={{ ...selectTokens.base }}
                        >
                          <option value="name">{t('sort_name') || 'Trier: Nom'}</option>
                          <option value="update">
                            {t('sort_update') || 'Trier: Priorité MAJ'}
                          </option>
                        </select>
                      </div>
                      {!!outdated.length && (
                        <Button
                          onClick={bulkUpgrade}
                          title={t('update_all') || 'Tout mettre à jour'}
                          variant="ghost"
                          size="sm"
                          style={{
                            background: 'linear-gradient(135deg,#3B82F6 0%, #2563EB 100%)',
                            border: 'none',
                          }}
                          leftIcon={<RefreshCw size={16} />}
                        >
                          {t('update_all') || 'Tout MAJ'} ({outdated.length})
                        </Button>
                      )}
                    </div>
                  }
                >
                  {sortedInstalled.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                      {t('no_installed_packages') || 'Aucun paquet installé'}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                        gap: 12,
                      }}
                    >
                      {sortedInstalled.map((p) => {
                        const od = outdated.find(
                          (o) => o.name.toLowerCase() === p.name.toLowerCase(),
                        )
                        return (
                          <div
                            key={p.name}
                            style={{
                              ...surface.muted,
                              padding: 14,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontWeight: 800,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                }}
                              >
                                {p.name}
                                {od && (
                                  <span
                                    style={{
                                      fontSize: 11,
                                      padding: '2px 6px',
                                      borderRadius: 999,
                                      background: 'rgba(59,130,246,0.2)',
                                      color: '#93C5FD',
                                      border: '1px solid rgba(59,130,246,0.35)',
                                    }}
                                  >
                                    MAJ {od.available}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                v{p.version}
                                {od ? ` → ${od.available}` : ''}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {od && (
                                <Button
                                  onClick={() => upgrade(p.name)}
                                  disabled={busy === `upgrade:${p.name}`}
                                  variant="ghost"
                                  size="sm"
                                  style={{
                                    background: 'linear-gradient(135deg,#3B82F6 0%, #2563EB 100%)',
                                    border: 'none',
                                  }}
                                  leftIcon={<RefreshCw size={16} />}
                                >
                                  {t('update') || 'Mettre à jour'}
                                </Button>
                              )}
                              <Button
                                onClick={() => uninstall(p.name)}
                                disabled={busy === `uninstall:${p.name}`}
                                variant="ghost"
                                size="sm"
                                style={{
                                  background: 'linear-gradient(135deg,#EF4444 0%, #DC2626 100%)',
                                  border: 'none',
                                }}
                                leftIcon={<Trash2 size={16} />}
                              >
                                {t('uninstall') || 'Désinstaller'}
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </SectionCard>
              </motion.div>
            )}

            {activeTab === 'outdated' && (
              <motion.div
                key="tab-outdated"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <SectionCard
                  title={t('available_updates') || 'Mises à jour disponibles'}
                  right={
                    !!outdated.length && (
                      <Button
                        onClick={bulkUpgrade}
                        title={t('update_all') || 'Tout mettre à jour'}
                        variant="ghost"
                        size="sm"
                        style={{
                          background: 'linear-gradient(135deg,#3B82F6 0%, #2563EB 100%)',
                          border: 'none',
                        }}
                        leftIcon={<RefreshCw size={16} />}
                      >
                        {t('update_all') || 'Tout mettre à jour'} ({outdated.length})
                      </Button>
                    )
                  }
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {outdated.map((o) => (
                      <div
                        key={o.name}
                        style={{
                          ...surface.muted,
                          padding: 14,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800 }}>{o.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Actuel {o.current} → Dispo {o.available}
                          </div>
                        </div>
                        <Button
                          onClick={() => upgrade(o.name)}
                          variant="ghost"
                          size="sm"
                          style={{
                            background: 'linear-gradient(135deg,#3B82F6 0%, #2563EB 100%)',
                            border: 'none',
                          }}
                          leftIcon={<RefreshCw size={16} />}
                        >
                          {t('update') || 'Mettre à jour'}
                        </Button>
                      </div>
                    ))}
                    {!outdated.length && (
                      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                        {t('all_up_to_date') || 'Tout est à jour'}
                      </div>
                    )}
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {activeTab === 'terminal' && (
              <motion.div
                key="tab-terminal"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <SectionCard
                  title={t('choco_terminal') || 'Terminal Chocolatey'}
                  right={
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTerminalLines([])}
                        title={t('clear')}
                      >
                        {t('clear')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={copyLogs} title={t('copy')}>
                        {t('copy')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={exportLogs} title={t('export')}>
                        {t('export')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={repairAndRetry}
                        title="Réparer Chocolatey puis relancer la dernière commande"
                        disabled={isRunning || !canRetry}
                        style={{
                          background: 'linear-gradient(135deg,#F59E0B 0%, #D97706 100%)',
                          border: 'none',
                        }}
                      >
                        Réparer + Relancer
                      </Button>
                    </div>
                  }
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      marginBottom: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <input
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          runCustomCommand()
                        } else if (e.key === 'ArrowUp') {
                          if (!historyCmd.length) return
                          const nextIdx =
                            historyIndex < 0 ? 0 : Math.min(historyIndex + 1, historyCmd.length - 1)
                          setHistoryIndex(nextIdx)
                          setCommand(historyCmd[nextIdx] || '')
                          e.preventDefault()
                        } else if (e.key === 'ArrowDown') {
                          if (historyIndex <= 0) {
                            setHistoryIndex(-1)
                            setCommand('')
                          } else {
                            const nextIdx = historyIndex - 1
                            setHistoryIndex(nextIdx)
                            setCommand(historyCmd[nextIdx] || '')
                          }
                          e.preventDefault()
                        }
                      }}
                      placeholder={t('choco_command_placeholder') || 'choco upgrade all -y'}
                      title={t('enter_choco_command') || 'Saisir une commande Chocolatey'}
                      style={{ ...inputTokens.base, minWidth: 280, flex: 1 }}
                    />
                    <Button
                      onClick={runCustomCommand}
                      title={t('execute') || 'Exécuter la commande'}
                      variant="ghost"
                      style={{
                        background: 'linear-gradient(135deg,#8B5CF6 0%, #7C3AED 100%)',
                        border: 'none',
                      }}
                      disabled={isRunning}
                    >
                      {t('execute') || 'Exécuter'}
                    </Button>
                    <Button
                      onClick={async () => {
                        if (window.electronAPI && termSession) {
                          await window.electronAPI.chocoCancel(termSession)
                          setIsRunning(false)
                          setTerminalLines((prev) => [...prev, '\n— Annulé —\n'])
                        }
                      }}
                      title={t('stop') || 'Stopper la commande'}
                      variant="outline"
                      disabled={!isRunning}
                    >
                      {t('stop') || 'Stopper'}
                    </Button>
                    <Button
                      onClick={async () => {
                        const raw = command.trim()
                        if (!raw) return
                        const withoutPrefix = raw.startsWith('choco ') ? raw.slice(6) : raw
                        const args = withoutPrefix.split(' ').filter(Boolean)
                        saveHistory(raw)
                        setCommand('')
                        if (window.electronAPI && (window.electronAPI as any).chocoRunElevated) {
                          setTerminalLines((prev) => [
                            ...prev,
                            `> [ADMIN] choco ${args.join(' ')}\n`,
                          ])
                          setIsRunning(true)
                          setStartedAt(Date.now())
                          setLastArgs(args)
                          await (window.electronAPI as any).chocoRunElevated(args, termSession)
                        }
                      }}
                      title="Exécuter en administrateur"
                      variant="ghost"
                      style={{
                        background: 'linear-gradient(135deg,#F59E0B 0%, #D97706 100%)',
                        border: 'none',
                      }}
                      disabled={isRunning}
                    >
                      Exécuter (Admin)
                    </Button>
                    {lastArgs && (
                      <Button
                        onClick={() => runChoco(lastArgs)}
                        title={t('rerun_last') || 'Relancer la dernière commande'}
                        variant="outline"
                        disabled={isRunning}
                      >
                        {t('rerun') || 'Relancer'}
                      </Button>
                    )}
                    <Button
                      onClick={() => addFavorite(command)}
                      title={t('add_favorite') || 'Ajouter aux favoris'}
                      variant="outline"
                      disabled={!command.trim()}
                    >
                      {t('add_favorite') || 'Ajouter aux favoris'}
                    </Button>
                    {isRunning && (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        En cours… {Math.floor(elapsed / 1000)}s
                      </span>
                    )}
                  </div>

                  {favorites.length > 0 && (
                    <div
                      style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}
                      aria-label={t('favorites') || 'Favoris'}
                    >
                      {favorites.map((f, i) => (
                        <span
                          key={i}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            border: '1px solid var(--border)',
                            borderRadius: 999,
                            padding: '4px 8px',
                            background: 'rgba(255,255,255,0.06)',
                          }}
                        >
                          <button
                            onClick={() => setCommand(f)}
                            title={f}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            {f}
                          </button>
                          <button
                            onClick={() => removeFavorite(f)}
                            title={t('remove') || 'Supprimer'}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {historyCmd.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      {historyCmd.map((h, i) => (
                        <Button
                          key={i}
                          size="sm"
                          variant="outline"
                          onClick={() => setCommand(h)}
                          title={h}
                          style={{ borderRadius: 999, padding: '4px 8px' }}
                        >
                          {h}
                        </Button>
                      ))}
                    </div>
                  )}

                  <div
                    style={{
                      height: 260,
                      overflow: 'auto',
                      background: 'rgba(0,0,0,0.35)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: 12,
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.9)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {terminalLines.length ? terminalLines.join('') : 'Prêt.\n'}
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* Modale d'information paquet (enrichie) */}
            <AnimatePresence>
              {pkgInfo && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20,
                  }}
                  onClick={() => setPkgInfo(null)}
                >
                  <motion.div
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.96, opacity: 0 }}
                    style={{
                      width: 'min(92vw, 820px)',
                      maxHeight: '82vh',
                      overflow: 'auto',
                      background: 'rgba(20,20,20,.98)',
                      border: '1px solid var(--border)',
                      borderRadius: 14,
                      padding: 20,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <strong style={{ fontSize: 18 }}>{pkgInfo.name}</strong>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPkgInfo(null)}
                        title="Fermer"
                      >
                        <X size={14} />
                      </Button>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      {parsedInfo?.homepage && (
                        <a
                          href={parsedInfo.homepage}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            color: '#93C5FD',
                            textDecoration: 'none',
                          }}
                        >
                          <ExternalLink size={14} /> Projet
                        </a>
                      )}
                      {parsedInfo?.docs && (
                        <a
                          href={parsedInfo.docs}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            color: '#93C5FD',
                            textDecoration: 'none',
                          }}
                        >
                          <ExternalLink size={14} /> Documentation
                        </a>
                      )}
                      {parsedInfo?.bugs && (
                        <a
                          href={parsedInfo.bugs}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            color: '#93C5FD',
                            textDecoration: 'none',
                          }}
                        >
                          <ExternalLink size={14} /> Suivi des bugs
                        </a>
                      )}
                      {parsedInfo?.releases && (
                        <a
                          href={parsedInfo.releases}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            color: '#93C5FD',
                            textDecoration: 'none',
                          }}
                        >
                          <ExternalLink size={14} /> Notes de version
                        </a>
                      )}
                      {parsedInfo?.source && (
                        <a
                          href={parsedInfo.source}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            color: '#93C5FD',
                            textDecoration: 'none',
                          }}
                        >
                          <ExternalLink size={14} /> Code source
                        </a>
                      )}
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      {(['overview', 'deps', 'versions'] as const).map((k) => (
                        <Button
                          key={k}
                          size="sm"
                          variant={infoTab === k ? 'primary' : 'outline'}
                          onClick={() => setInfoTab(k)}
                        >
                          {k === 'overview' ? 'Aperçu' : k === 'deps' ? 'Dépendances' : 'Versions'}
                        </Button>
                      ))}
                    </div>

                    {infoTab === 'overview' && (
                      <>
                        {/* Métadonnées clés */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                            gap: 12,
                            marginBottom: 12,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              Mainteneur
                            </div>
                            <div style={{ fontWeight: 700 }}>{parsedInfo?.maintainer || '—'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Licence</div>
                            <div style={{ fontWeight: 700 }}>{parsedInfo?.license || '—'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              Publié / Mis à jour
                            </div>
                            <div style={{ fontWeight: 700 }}>{parsedInfo?.published || '—'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              Étiquettes
                            </div>
                            <div style={{ fontWeight: 700 }}>{parsedInfo?.tags || '—'}</div>
                          </div>
                        </div>
                        <div
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--border)',
                            borderRadius: 10,
                            padding: 12,
                            marginBottom: 12,
                          }}
                        >
                          <div
                            style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}
                          >
                            Description
                          </div>
                          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
                            {parsedInfo?.description || 'Aucune information.'}
                          </div>
                        </div>
                      </>
                    )}

                    {infoTab === 'deps' && (
                      <div
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: 12,
                        }}
                      >
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                          Dépendances
                        </div>
                        <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
                          {parsedInfo?.dependencies || '—'}
                        </div>
                      </div>
                    )}

                    {infoTab === 'versions' && (
                      <div
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: 12,
                        }}
                      >
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                          Toutes les versions
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {versions?.length
                            ? versions.map((v, i) => (
                                <Button
                                  key={i}
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setCommand(`choco install ${pkgInfo?.name} --version ${v}`)
                                  }
                                  title={`Installer ${v}`}
                                >
                                  {v}
                                </Button>
                              ))
                            : '—'}
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: 12,
                        marginTop: 12,
                      }}
                    >
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                        Champs bruts
                      </div>
                      <pre
                        style={{
                          whiteSpace: 'pre-wrap',
                          color: 'rgba(255,255,255,0.85)',
                          fontSize: 12,
                          lineHeight: 1.5,
                        }}
                      >
                        {pkgInfo.content}
                      </pre>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

export default ChocolateyPage
