import { AnimatePresence, motion } from 'framer-motion'
import { FolderOpen, Info, Play, Search, Smartphone, X } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import UnifiedTile from '../../components/UnifiedTile/UnifiedTile'
import { t } from '../../i18n'
import toolsService, { Category, Tool } from '../../services/ToolsService'
import Button from '../../ui/components/Button'
import { closeBtn, modalBackdrop, modalCard } from '../../ui/modalStyles'
import { input as inputTokens, select as selectTokens, surface } from '../../ui/styles/tokens'

const PortableAppsPage: React.FC = () => {
  const hasElectron = typeof window !== 'undefined' && !!(window as any).electronAPI
  const normalizePath = (p: string) => {
    if (!p) return p
    let out = p
      .replace(/\\/g, '/')
      .replace(/\/assets\/assets\//g, '/assets/')
      .replace(/\/+/g, '/')
      .replace(/\/\/+/, '/')
    out = out.replace(/\/assets\/assets\//g, '/assets/')
    out = out.replace(/\/\/+/g, '/')
    out = out.replace('/assets/assets/', '/assets/')
    return out
  }
  const normalizeText = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .replace(/[^a-z0-9\s._-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  // Cache d'icônes (exePath -> dataURL) pour éviter les extractions répétées
  const [iconCache, setIconCache] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('vw_icon_cache') || '{}')
    } catch {
      return {}
    }
  })
  const [portableApps, setPortableApps] = useState<Tool[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [launchingApps, setLaunchingApps] = useState<string[]>([])
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [selectedApp, setSelectedApp] = useState<Tool | null>(null)
  const [rootDir, setRootDir] = useState<string | null>(null)
  const [resyncing, setResyncing] = useState(false)
  const [importModal, setImportModal] = useState<{
    sourcePath: string
    fileName: string
    folderName: string
  } | null>(null)
  const [launchArgs, setLaunchArgs] = useState<string>('')
  const [launchCwd, setLaunchCwd] = useState<string>('')
  const [launchAdmin, setLaunchAdmin] = useState<boolean>(false)
  const [portableLogs, setPortableLogs] = useState<
    { ts: number; type: 'info' | 'warn' | 'error' | 'success'; message: string }[]
  >([])
  const [launchTimeoutMs, setLaunchTimeoutMs] = useState<number>(1500)
  const [cwdStatus, setCwdStatus] = useState<'unknown' | 'valid' | 'invalid'>('unknown')

  const loadSavedOpts = (appId: string) => {
    try {
      const raw = localStorage.getItem('vw_portable_opts')
      const map = raw ? JSON.parse(raw) : {}
      return map[appId] || null
    } catch {
      return null
    }
  }
  const saveOpts = (
    appId: string,
    opts: { args?: string; cwd?: string; admin?: boolean; timeoutMs?: number },
  ) => {
    try {
      const raw = localStorage.getItem('vw_portable_opts')
      const map = raw ? JSON.parse(raw) : {}
      map[appId] = {
        args: opts.args || '',
        cwd: opts.cwd || '',
        admin: !!opts.admin,
        timeoutMs: typeof opts.timeoutMs === 'number' && opts.timeoutMs > 0 ? opts.timeoutMs : 1500,
      }
      localStorage.setItem('vw_portable_opts', JSON.stringify(map))
      return true
    } catch {
      return false
    }
  }

  const persistIconCache = (cache: Record<string, string>) => {
    try {
      // limite à 200 entrées pour éviter les surcharges
      const entries = Object.entries(cache)
      const limited = entries.slice(-200)
      const final: Record<string, string> = {}
      for (const [k, v] of limited) final[k] = v
      localStorage.setItem('vw_icon_cache', JSON.stringify(final))
    } catch {}
  }

  const isArgsValid = (s: string) => {
    // Vérifier guillemets non fermés
    const quoteCount = (s.match(/"/g) || []).length
    if (quoteCount % 2 !== 0) return false
    // Longueur raisonnable
    if (s.length > 2048) return false
    return true
  }

  const slugify = (s: string) =>
    (s || '')
      .normalize('NFD')
      .replace(/[\w\s.-]/g, (x) => x)
      .replace(/[^\w\s.-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[\s]+/g, '-')

  useEffect(() => {
    if (window.electronAPI && (window.electronAPI as any).onPortableLog) {
      window.electronAPI.onPortableLog((msg: any) => {
        setPortableLogs((prev) =>
          [
            ...prev,
            { ts: Date.now(), type: msg?.type || 'info', message: String(msg?.message || '') },
          ].slice(-200),
        )
      })
    }
  }, [])

  const openImportModal = async () => {
    if (!window.electronAPI) return
    const files = await window.electronAPI.selectFiles({
      filters: [{ name: 'Exécutables', extensions: ['exe'] }],
      multi: false,
    })
    if (files && files[0]) {
      const src = files[0].path
      const base = files[0].name.replace(/\.exe$/i, '')
      setImportModal({ sourcePath: src, fileName: files[0].name, folderName: slugify(base) })
    }
  }

  const confirmImport = async () => {
    if (!window.electronAPI || !importModal) return
    const dest = await window.electronAPI.importPortableExe({
      sourcePath: importModal.sourcePath,
      targetName: importModal.folderName,
    })
    if (dest) {
      showSuccessNotification('Exécutable importé. Rescan...')
      setImportModal(null)
      await rescan()
    } else {
      showErrorNotification("Échec de l'import")
    }
  }

  // Informations détaillées pour chaque application
  const appDetails: { [key: string]: any } = {
    'Google Chrome Portable': {
      developer: 'Google LLC',
      website: 'https://www.google.com/chrome/',
      license: 'Propriétaire',
      features: [
        'Navigation web rapide et sécurisée',
        'Synchronisation des favoris et mots de passe',
        'Extensions et thèmes personnalisables',
        'Mode navigation privée',
        'Traduction automatique des pages',
        'Gestionnaire de téléchargements',
      ],
      systemRequirements: 'Windows 7 ou plus récent',
      lastUpdate: 'Décembre 2024',
      notes:
        "Version portable qui ne nécessite pas d'installation et peut être utilisée depuis une clé USB.",
    },
    'Mozilla Firefox Portable': {
      developer: 'Mozilla Foundation',
      website: 'https://www.mozilla.org/firefox/',
      license: 'Open Source (MPL)',
      features: [
        'Navigation web respectueuse de la vie privée',
        'Protection contre le tracking',
        'Extensions open source',
        'Mode lecture',
        "Capture d'écran intégrée",
        'Gestionnaire de mots de passe',
      ],
      systemRequirements: 'Windows 7 ou plus récent',
      lastUpdate: 'Décembre 2024',
      notes: 'Navigateur open source avec une forte emphase sur la protection de la vie privée.',
    },
    'qBittorrent Portable': {
      developer: 'The qBittorrent project',
      website: 'https://www.qbittorrent.org/',
      license: 'Open Source (GPL)',
      features: [
        'Client BitTorrent complet',
        'Interface utilisateur intuitive',
        'Limitation de bande passante',
        'Planification des téléchargements',
        'Support des torrents magnétiques',
        'Intégration avec les trackers',
      ],
      systemRequirements: 'Windows 7 ou plus récent',
      lastUpdate: 'Novembre 2024',
      notes: 'Alternative open source à uTorrent, sans publicités ni logiciels malveillants.',
    },
    'FileZilla Portable': {
      developer: 'Tim Kosse',
      website: 'https://filezilla-project.org/',
      license: 'Open Source (GPL)',
      features: [
        'Client FTP/SFTP/FTPS',
        'Interface drag & drop',
        'Gestionnaire de sites',
        'Comparaison de répertoires',
        'Filtres de fichiers',
        'Support des connexions sécurisées',
      ],
      systemRequirements: 'Windows 7 ou plus récent',
      lastUpdate: 'Octobre 2024',
      notes: 'Client FTP robuste et fiable pour le transfert de fichiers.',
    },
    'Sumatra PDF Portable': {
      developer: 'Krzysztof Kowalczyk',
      website: 'https://www.sumatrapdfreader.org/',
      license: 'Open Source (GPL)',
      features: [
        'Lecteur PDF léger et rapide',
        'Support des formats eBook',
        'Recherche de texte',
        'Mode présentation',
        'Interface minimaliste',
        'Démarrage instantané',
      ],
      systemRequirements: 'Windows 7 ou plus récent',
      lastUpdate: 'Septembre 2024',
      notes: 'Lecteur PDF ultra-rapide avec une empreinte mémoire minimale.',
    },
    'Foxit Reader Portable': {
      developer: 'Foxit Software',
      website: 'https://www.foxit.com/',
      license: 'Propriétaire',
      features: [
        'Lecteur PDF avancé',
        'Annotation et commentaires',
        'Remplissage de formulaires',
        'Signature numérique',
        'Protection par mot de passe',
        'Support multi-langues',
      ],
      systemRequirements: 'Windows 7 ou plus récent',
      lastUpdate: 'Décembre 2024',
      notes: 'Alternative complète à Adobe Reader avec des fonctionnalités avancées.',
    },
  }

  const showAppInfo = (app: Tool) => {
    setSelectedApp(app)
    if (app.executablePath) {
      const dir = normalizePath(app.executablePath).replace(/\\[^\\]+$/, '')
      setLaunchCwd(dir)
    } else {
      setLaunchCwd('')
    }
    const saved = loadSavedOpts(app.id)
    if (saved) {
      setLaunchArgs(saved.args || '')
      setLaunchAdmin(!!saved.admin)
      if (saved.cwd) setLaunchCwd(saved.cwd)
      if (typeof saved.timeoutMs === 'number') setLaunchTimeoutMs(saved.timeoutMs)
    } else {
      setLaunchArgs('')
      setLaunchAdmin(false)
      setLaunchTimeoutMs(1500)
    }
    setInfoModalOpen(true)
  }

  const closeInfoModal = () => {
    setInfoModalOpen(false)
    setSelectedApp(null)
  }

  const rescan = useCallback(async () => {
    setResyncing(true)
    try {
      setLoading(true)
      const [appsData, categoriesData] = await Promise.all([
        toolsService.scanPortableApps(),
        Promise.resolve(toolsService.getPortableCategories()),
      ])
      // tenter d’associer une icône depuis assets/icons par nom
      try {
        for (const a of appsData) {
          if (
            (!a.iconPath || a.iconPath.startsWith('file://') === false) &&
            window.electronAPI &&
            (window.electronAPI as any).findIconForName
          ) {
            const found = await window.electronAPI.findIconForName(a.title)
            if (found) {
              ;(a as any).iconPath = found
              continue
            }
            if (a.executablePath && (window.electronAPI as any).getFileIconDataUrl) {
              const key = normalizePath(a.executablePath)
              const cached = iconCache[key]
              if (cached) {
                ;(a as any).iconPath = cached
              } else {
                const dataUrl = await window.electronAPI.getFileIconDataUrl(a.executablePath)
                if (dataUrl) {
                  ;(a as any).iconPath = dataUrl
                  const next = { ...iconCache, [key]: dataUrl }
                  setIconCache(next)
                  persistIconCache(next)
                }
              }
            }
          }
        }
      } catch {}
      setPortableApps(appsData)
      setCategories(categoriesData)
    } finally {
      setLoading(false)
      setResyncing(false)
    }
  }, [iconCache])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [appsData, categoriesData] = await Promise.all([
        toolsService.scanPortableApps(),
        Promise.resolve(toolsService.getPortableCategories()),
      ])
      // tenter d’associer une icône depuis assets/icons par nom
      try {
        for (const a of appsData) {
          if (
            (!a.iconPath || a.iconPath.startsWith('file://') === false) &&
            window.electronAPI &&
            (window.electronAPI as any).findIconForName
          ) {
            const found = await window.electronAPI.findIconForName(a.title)
            if (found) {
              ;(a as any).iconPath = found
              continue
            }
            // fallback: extraire l'icône native de l'exécutable
            if (a.executablePath && (window.electronAPI as any).getFileIconDataUrl) {
              const key = normalizePath(a.executablePath)
              const cached = iconCache[key]
              if (cached) {
                ;(a as any).iconPath = cached
              } else {
                const dataUrl = await window.electronAPI.getFileIconDataUrl(a.executablePath)
                if (dataUrl) {
                  ;(a as any).iconPath = dataUrl
                  const next = { ...iconCache, [key]: dataUrl }
                  setIconCache(next)
                  persistIconCache(next)
                }
              }
            }
          }
        }
      } catch {}
      setPortableApps(appsData)
      setCategories(categoriesData)
    } finally {
      setLoading(false)
    }
  }, [iconCache])

  useEffect(() => {
    loadData()
    ;(async () => {
      try {
        if (window.electronAPI && (window.electronAPI as any).getPortableRootDir) {
          const dir = await window.electronAPI.getPortableRootDir()
          setRootDir(dir)
        }
        // démarrer le watcher de changements
        if (window.electronAPI && (window.electronAPI as any).startPortableWatch) {
          await window.electronAPI.startPortableWatch()
          window.electronAPI.onPortableChanged(async () => {
            await rescan()
          })
        }
      } catch {}
    })()
  }, [loadData, rescan])

  // pickRootDir supprimé à la demande (suppression du champ et du bouton)

  const getProcessNameToKill = (appTitle: string): string[] => {
    // Mapping des noms d'applications vers leurs noms de processus (peut être multiple)
    const processMap: { [key: string]: string[] } = {
      'Inkscape Portable': ['inkscape.exe'],
      'Krita Portable': ['krita.exe'],
      'Paint.NET Portable': ['paintdotnet.exe', 'PaintDotNet.exe'],
      'FreeCommander XE Portable': ['freecommander.exe', 'FreeCommander.exe'],
      'Explorer++ Portable': ['explorer++.exe'],
      'GPU-Z Portable': ['gpu-z.exe'],
      'Google Chrome Portable': ['chrome.exe'],
      'Mozilla Firefox Portable': ['firefox.exe'],
      'qBittorrent Portable': ['qbittorrent.exe', 'qBittorrent.exe', 'qBittorrentPortable.exe'],
      'FileZilla Portable': ['filezilla.exe'],
      'VLC Media Player Portable': ['vlc.exe'],
      'Sumatra PDF Portable': ['sumatrapdf.exe', 'SumatraPDF.exe'],
      'Foxit Reader Portable': ['foxitreader.exe', 'FoxitReader.exe'],
      'PDF-XChange Editor Portable': ['pdfxedit.exe', 'PDF-XChangeEditor.exe'],
      'GIMP Portable': ['gimp-2.10.exe', 'gimp.exe', 'gimp-3.0.exe', 'gimp-3.exe'],
      'Audacity Portable': ['audacity.exe'],
      'Malwarebytes Portable': ['mbam.exe', 'mbamservice.exe', 'mbamscheduler.exe'],
    }

    return processMap[appTitle] || []
  }

  const killQBitTorrentProcesses = async () => {
    if (!window.electronAPI) return

    // Fermeture agressive qBittorrent
    await window.electronAPI.killQBitTorrentAggressive()

    // attente sécurité
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // Vérification finale
  }

  const showSuccessNotification = (message: string) => {
    // Créer une notification temporaire
    const notification = document.createElement('div')
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
      z-index: 10000;
      font-weight: 600;
      max-width: 300px;
      animation: slideIn 0.3s ease;
    `
    notification.textContent = message
    document.body.appendChild(notification)

    // Supprimer après 3 secondes
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease'
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 3000)
  }

  const showErrorNotification = (message: string) => {
    // Créer une notification d'erreur temporaire
    const notification = document.createElement('div')
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(239, 68, 68, 0.3);
      z-index: 10000;
      font-weight: 600;
      max-width: 300px;
      animation: slideIn 0.3s ease;
    `
    notification.textContent = message
    document.body.appendChild(notification)

    // Supprimer après 5 secondes
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease'
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 5000)
  }

  const exportPortableLogs = async () => {
    try {
      const p = (window as any).electronAPI?.portableGetLogFile
        ? await (window as any).electronAPI.portableGetLogFile()
        : null
      if (p && typeof p === 'string') {
        const dir = p.replace(/\\[^\\]*$/, '')
        await (window as any).electronAPI.openFolder(dir)
        return
      }
    } catch {}
    // Fallback: exporter les logs affichés
    const text = portableLogs
      .map((l) => `[${new Date(l.ts).toISOString()}] ${l.type.toUpperCase()} ${l.message}`)
      .join('\n')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portable-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleLaunch = async (toolId: string) => {
    try {
      setLaunchingApps((prev) => [...prev, toolId])

      // Vérifier que l'API Electron est disponible
      if (!window.electronAPI) {
        console.error('API Electron non disponible')
        showErrorNotification('API Electron non disponible')
        return
      }

      // Récupérer l'application portable
      const app = portableApps.find((a) => a.id === toolId)
      if (!app) {
        console.error(`Application portable non trouvée: ${toolId}`)
        showErrorNotification('Application portable non trouvée')
        return
      }

      // Tuer les processus existants avant de lancer
      if (app.title === 'qBittorrent Portable') {
        // Utiliser la fonction spéciale pour qBittorrent
        await killQBitTorrentProcesses()
      } else {
        // Utiliser la logique générale pour les autres applications
        const processNamesToKill = getProcessNameToKill(app.title)
        if (processNamesToKill.length > 0 && window.electronAPI) {
          // Tuer tous les processus
          for (const processName of processNamesToKill) {
            await window.electronAPI.killProcessByName(processName)
          }

          // Attendre un peu pour que les processus se ferment
          await new Promise((resolve) => setTimeout(resolve, 2000))

          // Vérifier que les processus sont bien fermés
          for (const processName of processNamesToKill) {
            const isRunning = await window.electronAPI.isProcessRunning(processName)
            if (isRunning) {
              await window.electronAPI.killProcessByName(processName)
              await new Promise((resolve) => setTimeout(resolve, 1000))
            }
          }
        }
      }

      // Construire le chemin correct selon l'application
      let launcherPath = app.executablePath
      if (launcherPath) {
        // Extraire le dossier de l'application
        const pathParts = launcherPath.split('/')
        pathParts.pop() // Retirer le nom du fichier
        const appFolder = pathParts.join('/')
        const folderName = appFolder.split('/').pop()

        // Construire le chemin correct selon l'application
        if (folderName === 'GoogleChrome') {
          launcherPath = `${appFolder}/GoogleChrome.exe`
        } else if (folderName === 'FirefoxPortable') {
          launcherPath = `${appFolder}/Firefox.exe`
        } else if (folderName === 'qBittorrentPortable') {
          // Pour qBittorrent, lancer directement l'exécutable au lieu du launcher
          launcherPath = `${appFolder}/App/qBittorrent/qbittorrent.exe`
        } else if (folderName === 'FileZillaPortable') {
          // Pour FileZilla, lancer directement l'exécutable au lieu du launcher
          launcherPath = `${appFolder}/App/Filezilla64/filezilla.exe`
        } else if (folderName === 'VLCPortable') {
          // Pour VLC, lancer directement l'exécutable au lieu du launcher
          launcherPath = `${appFolder}/App/vlc/vlc.exe`
        } else if (folderName === 'InkscapePortable') {
          // Pour Inkscape, lancer directement l'exécutable au lieu du launcher
          launcherPath = `${appFolder}/App/Inkscape/bin/inkscape.exe`
        } else if (folderName === 'KritaPortable') {
          // Pour Krita, lancer directement l'exécutable au lieu du launcher
          launcherPath = `${appFolder}/App/Krita64/bin/krita.exe`
        } else if (folderName === 'PaintDotNetPortable') {
          // Pour Paint.NET, lancer directement l'exécutable au lieu du launcher
          launcherPath = `${appFolder}/App/PaintDotNet64/paintdotnet.exe`
        } else if (folderName === 'FreeCommanderPortable') {
          // Pour FreeCommander, lancer directement l'exécutable au lieu du launcher
          launcherPath = `${appFolder}/App/FreeCommanderXE/FreeCommander.exe`
        } else if (folderName === 'Explorer++Portable') {
          // Pour Explorer++, lancer directement l'exécutable au lieu du launcher
          launcherPath = `${appFolder}/App/Explorer++/explorer++.exe`
        } else if (folderName === 'GPU-ZPortable') {
          // Pour GPU-Z, lancer directement l'exécutable au lieu du launcher
          launcherPath = `${appFolder}/App/GPU-Z/GPU-Z.exe`
        } else if (folderName === 'GIMPPortable') {
          // Pour GIMP, utiliser le launcher PortableApps
          launcherPath = `${appFolder}/GIMP.exe`
        } else if (folderName === 'malwarebytes') {
          // Pour Malwarebytes, utiliser le launcher PortableApps
          launcherPath = `${appFolder}/Malwarebytes.exe`
        } else if (folderName === 'SumatraPDF') {
          launcherPath = `${appFolder}/SumatraPDF-3.5.2-64.exe`
        } else if (folderName === 'FoxitReaderPortable') {
          launcherPath = `${appFolder}/FoxitReader.exe`
        } else if (folderName === 'PDF-XChangeEditorPortable') {
          launcherPath = `${appFolder}/PDF-XChangeEditor.exe`
        } else {
          // Par défaut, utiliser le chemin original
        }
      }

      // Si le launcher existe, le lancer
      if (launcherPath && window.electronAPI) {
        // Mode Electron - utiliser l'API Electron
        // Vérifier si le fichier existe avant de tenter de le lancer
        try {
          // Normalisation des chemins (évite 'assets/assets' et mix / \)
          launcherPath = normalizePath(launcherPath)
          const fileExists = await window.electronAPI.checkFileExists(launcherPath)

          if (!fileExists) {
            console.error(`Fichier introuvable: ${launcherPath}`)
            // Essayer le chemin original comme fallback
            if (app.executablePath && app.executablePath !== launcherPath) {
              const originalExists = await window.electronAPI.checkFileExists(
                normalizePath(app.executablePath),
              )
              if (originalExists) {
                const fallbackSuccess = await window.electronAPI.launchApplication(
                  normalizePath(app.executablePath),
                )
                if (fallbackSuccess) {
                  showSuccessNotification(`${app.title} lancé avec succès !`)
                } else {
                  console.error(`Échec du lancement de ${app.title} via chemin original`)
                  showErrorNotification(`Échec du lancement de ${app.title}`)
                }
              } else {
                console.error(`Aucun chemin valide trouvé pour ${app.title}`)
                showErrorNotification(`Aucun chemin valide trouvé pour ${app.title}`)
              }
            }
            return
          }

          // Appliquer des options sauvegardées si disponibles
          const saved = loadSavedOpts(app.id)
          if (saved && window.electronAPI && (window.electronAPI as any).launchPortable) {
            const args = (saved.args || '').trim()
              ? (saved.args as string).match(/(?:[^\s"]+|"[^"]*")+/g) || []
              : []
            const ok = await window.electronAPI.launchPortable({
              exePath: launcherPath,
              cwd: (saved.cwd || '').trim() || launcherPath.replace(/\\[^\\]+$/, ''),
              args: args.map((a: string) => a.replace(/^"|"$/g, '')),
              elevated: !!saved.admin,
              timeoutMs: 1500,
            })
            if (ok) {
              showSuccessNotification(`${app.title} lancé avec succès !`)
            } else {
              showErrorNotification(`Échec du lancement de ${app.title}`)
            }
            return
          }

          // Sinon: utiliser launchApplication/WithCwd pour les applications qui se ferment rapidement
          let success
          if (app.title === 'GIMP Portable') {
            const workingDir = launcherPath.replace('/GIMP.exe', '')

            success = await window.electronAPI.launchApplicationWithCwd(launcherPath, workingDir)
          } else if (app.title === 'Malwarebytes Portable') {
            const workingDir = launcherPath.replace('/Malwarebytes.exe', '')

            success = await window.electronAPI.launchApplicationWithCwd(launcherPath, workingDir)
          } else {
            success = await window.electronAPI.launchApplication(launcherPath)
          }

          if (success) {
            showSuccessNotification(`${app.title} lancé avec succès !`)
          } else {
            console.error(`Échec du lancement de ${app.title} via launcher`)
            showErrorNotification(`Échec du lancement de ${app.title}`)
          }
        } catch (error) {
          console.error(`Erreur lors du lancement de ${app.title}:`, error)
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
          showErrorNotification(`Erreur lors du lancement de ${app.title}: ${errorMessage}`)
          // Essayer le chemin original comme fallback
          if (app.executablePath && app.executablePath !== launcherPath) {
            try {
              const fallbackSuccess = await window.electronAPI.launchApplication(
                normalizePath(app.executablePath),
              )
              if (fallbackSuccess) {
                showSuccessNotification(`${app.title} lancé avec succès !`)
              } else {
                console.error(`Échec du lancement de ${app.title} via chemin original`)
                showErrorNotification(`Échec du lancement de ${app.title}`)
              }
            } catch (fallbackError) {
              console.error(`Erreur lors du fallback:`, fallbackError)
              showErrorNotification(`Erreur lors du lancement de ${app.title}`)
            }
          }
        }
      } else if (launcherPath) {
        // Mode navigateur - utiliser window.open

        try {
          // En mode navigateur, on ne peut pas lancer directement les exécutables
          // On affiche un message informatif
          showErrorNotification(
            `Mode navigateur détecté. Lancez l'application en mode Electron pour utiliser cette fonctionnalité.`,
          )
        } catch (error) {
          console.error('Erreur en mode navigateur:', error)
          showErrorNotification('Erreur en mode navigateur')
        }
      } else {
        console.error('Chemin de lancement non disponible')
        showErrorNotification('Chemin de lancement non disponible')
      }
    } catch (error) {
      console.error('Erreur générale lors du lancement:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      showErrorNotification(`Erreur lors du lancement de l'application: ${errorMessage}`)
    } finally {
      setLaunchingApps((prev) => prev.filter((id) => id !== toolId))
    }
  }

  // Debounce de la recherche
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  const filteredApps = portableApps.filter((app) => {
    const needle = normalizeText(debouncedSearch)
    const terms = needle ? needle.split(' ') : []
    const hay = normalizeText(app.title + ' ' + app.description + ' ' + app.tags.join(' '))
    const matchesSearch = !needle || terms.every((term) => hay.includes(term))

    const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const getActionButton = (app: Tool) => {
    if (launchingApps.includes(app.id)) {
      return {
        text: 'Lancement...',
        icon: () => <span style={{display:'inline-block',transform:'rotate(0deg)'}}>↻</span>,
        action: () => {},
        status: 'installing' as const,
      }
    }

    // Toujours retourner Info maintenant
    return {
      text: 'Info',
      icon: Info,
      action: () => showAppInfo(app),
      status: 'info' as const,
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw size={48} color="#10B981" />
        </motion.div>
      </div>
    )
  }

  const testCwd = async () => {
    if (!launchCwd) {
      setCwdStatus('unknown')
      return
    }
    try {
      const ok = await window.electronAPI.checkFileExists(launchCwd)
      setCwdStatus(ok ? 'valid' : 'invalid')
      if (ok) showSuccessNotification('CWD valide')
      else showErrorNotification('CWD introuvable')
    } catch {
      setCwdStatus('invalid')
      showErrorNotification('Erreur lors de la vérification du CWD')
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {!hasElectron && (
        <div
          role="alert"
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(245,158,11,0.35)',
            background: 'rgba(245,158,11,0.12)',
            color: '#F59E0B',
          }}
        >
          {t('api_unavailable') || 'API Electron non disponible'}
        </div>
      )}
      {/* En-tête */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ marginBottom: '32px' }}
      >
        {/* Bandeau configuration */}
        <div
          style={{
            ...surface.muted,
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            marginBottom: '16px',
            padding: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 280 }}>
            <FolderOpen size={18} color="var(--icon)" />
            <div style={{ fontWeight: 700 }}>Dossier PortableApps</div>
          </div>
          {/* Affichage du chemin et bouton supprimés à la demande */}
          <Button variant="outline" size="md" onClick={openImportModal}>
            {t('import_exe') || 'Importer .EXE'}
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => window.electronAPI && window.electronAPI.openPortableRoot()}
          >
            Ouvrir
          </Button>
          <Button variant="primary" size="md" onClick={rescan} disabled={resyncing}>
            {resyncing ? 'Analyse…' : 'Rescanner'}
          </Button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Smartphone size={28} color="white" />
          </div>
          <div>
            <h1
              style={{
                fontSize: '36px',
                fontWeight: '800',
                margin: '0 0 8px 0',
                backgroundImage: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Applications Portables
            </h1>
            <p
              style={{
                fontSize: '16px',
                color: 'rgba(255, 255, 255, 0.7)',
                margin: 0,
              }}
            >
              Lancez vos applications portables sans installation
            </p>
          </div>
        </div>

        {/* Statistiques */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          {[
            { label: 'Total Apps', value: portableApps.length, color: '#10B981' },
            {
              label: 'Disponibles',
              value: portableApps.filter((a) => a.status === 'launch').length,
              color: '#3B82F6',
            },
            {
              label: 'En Dossier',
              value: portableApps.filter((a) => a.status === 'info').length,
              color: '#F59E0B',
            },
            { label: 'Catégories', value: categories.length, color: '#8B5CF6' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: '800',
                  color: stat.color,
                  marginBottom: '8px',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Filtres et recherche */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '32px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Barre de recherche */}
        <div
          style={{
            position: 'relative',
            flex: '1',
            minWidth: '300px',
          }}
        >
          <Search
            size={20}
            color="rgba(255, 255, 255, 0.5)"
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
          <input
            aria-label={t('search_placeholder')}
            type="text"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ ...inputTokens.base, width: '100%', padding: '12px 16px 12px 48px' }}
            onFocus={(e) => {
              e.target.style.borderColor = '#10B981'
              e.target.style.background = 'rgba(255, 255, 255, 0.15)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
              e.target.style.background = 'rgba(255, 255, 255, 0.1)'
            }}
          />
        </div>

        {/* Filtre par catégorie */}
        <select
          aria-label="Filtrer par catégorie"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ ...selectTokens.base, minWidth: '200px', backdropFilter: 'blur(20px)' }}
        >
          <option
            value="all"
            style={{
              background: 'rgba(15, 15, 15, 0.95)',
              color: '#FFFFFF',
              padding: '8px',
            }}
          >
            Toutes les catégories
          </option>
          {categories.map((category) => (
            <option
              key={category.id}
              value={category.id}
              style={{
                background: 'rgba(15, 15, 15, 0.95)',
                color: '#FFFFFF',
                padding: '8px',
              }}
            >
              {category.name} ({category.count})
            </option>
          ))}
        </select>

        {/* Bouton de rafraîchissement */}
        <button
          onClick={loadData}
          style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            border: 'none',
            borderRadius: '12px',
            color: '#FFFFFF',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <RefreshCw size={20} />
          {t('refresh') || 'Actualiser'}
        </button>
      </motion.div>

      {/* Grille des apps portables */}
      <AnimatePresence mode="sync">
        {filteredApps.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              textAlign: 'center',
              padding: '64px 24px',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            <Smartphone size={64} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>
              {t('no_portable_apps') || 'Aucune app portable trouvée'}
            </h3>
            <p style={{ margin: 0, fontSize: '16px' }}>
              Essayez de modifier vos critères de recherche
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '24px',
            }}
          >
            {filteredApps.map((app, index) => {
              const actionButton = getActionButton(app)
              return (
                <UnifiedTile
                  key={app.id}
                  title={app.title}
                  version={app.version}
                  size={app.size}
                  description={app.description}
                  icon={Smartphone}
                  status={actionButton.status}
                  onAction={actionButton.action}
                  onLaunch={() => handleLaunch(app.id)}
                  onLaunchAdmin={async () => {
                    if (!window.electronAPI) return
                    const launchPath = app.executablePath || ''
                    const wd = launchPath.replace(/\\[^\\]+$/, '')
                    const elevated = await window.electronAPI.launchApplicationWithCwdElevated(
                      launchPath,
                      wd,
                    )
                    if (elevated) {
                      showSuccessNotification(`${app.title} lancé en administrateur !`)
                    } else {
                      showErrorNotification(`Échec du lancement admin de ${app.title}`)
                    }
                  }}
                  index={index}
                  iconPath={app.iconPath}
                />
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modale d'information */}
      <AnimatePresence>
        {infoModalOpen && selectedApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={modalBackdrop}
            onClick={closeInfoModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={modalCard}
              onClick={(e) => e.stopPropagation()}
            >
              {/* En-tête de la modale */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 24,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Smartphone size={24} color="white" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#FFFFFF' }}>
                      {selectedApp.title}
                    </h2>
                    <p style={{ margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.7)' }}>
                      {selectedApp.description}
                    </p>
                  </div>
                </div>
                <button onClick={closeInfoModal} title="Fermer" style={closeBtn}>
                  <X size={24} />
                </button>
              </div>

              {/* Informations détaillées */}
              {appDetails[selectedApp.title] && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  {/* Informations générales */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <h4
                        style={{
                          margin: '0 0 8px 0',
                          color: '#10B981',
                          fontSize: '14px',
                          fontWeight: '600',
                        }}
                      >
                        DÉVELOPPEUR
                      </h4>
                      <p style={{ margin: 0, color: '#FFFFFF' }}>
                        {appDetails[selectedApp.title].developer}
                      </p>
                    </div>
                    <div>
                      <h4
                        style={{
                          margin: '0 0 8px 0',
                          color: '#10B981',
                          fontSize: '14px',
                          fontWeight: '600',
                        }}
                      >
                        LICENCE
                      </h4>
                      <p style={{ margin: 0, color: '#FFFFFF' }}>
                        {appDetails[selectedApp.title].license}
                      </p>
                    </div>
                    <div>
                      <h4
                        style={{
                          margin: '0 0 8px 0',
                          color: '#10B981',
                          fontSize: '14px',
                          fontWeight: '600',
                        }}
                      >
                        SYSTÈME REQUIS
                      </h4>
                      <p style={{ margin: 0, color: '#FFFFFF' }}>
                        {appDetails[selectedApp.title].systemRequirements}
                      </p>
                    </div>
                    <div>
                      <h4
                        style={{
                          margin: '0 0 8px 0',
                          color: '#10B981',
                          fontSize: '14px',
                          fontWeight: '600',
                        }}
                      >
                        DERNIÈRE MAJ
                      </h4>
                      <p style={{ margin: 0, color: '#FFFFFF' }}>
                        {appDetails[selectedApp.title].lastUpdate}
                      </p>
                    </div>
                  </div>

                  {/* Fonctionnalités */}
                  <div>
                    <h4
                      style={{
                        margin: '0 0 12px 0',
                        color: '#10B981',
                        fontSize: '16px',
                        fontWeight: '600',
                      }}
                    >
                      FONCTIONNALITÉS PRINCIPALES
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#FFFFFF' }}>
                      {appDetails[selectedApp.title].features.map(
                        (feature: string, index: number) => (
                          <li key={index} style={{ marginBottom: '6px' }}>
                            {feature}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>

                  {/* Notes */}
                  <div>
                    <h4
                      style={{
                        margin: '0 0 8px 0',
                        color: '#10B981',
                        fontSize: '14px',
                        fontWeight: '600',
                      }}
                    >
                      NOTES
                    </h4>
                    <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.5' }}>
                      {appDetails[selectedApp.title].notes}
                    </p>
                  </div>

                  {/* Boutons */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <Button
                      variant="primary"
                      onClick={() => {
                        closeInfoModal()
                        handleLaunch(selectedApp.id)
                      }}
                      leftIcon={<Play size={20} />}
                    >
                      Lancer l'application
                    </Button>
                    <Button variant="ghost" onClick={closeInfoModal}>
                      Fermer
                    </Button>
                  </div>

                  {/* Options de lancement (avancé) */}
                  <div
                    style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}
                  >
                    <h4
                      style={{
                        margin: '0 0 8px 0',
                        color: '#10B981',
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      Options de lancement
                    </h4>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 90, color: 'var(--text-muted)', fontSize: 13 }}>
                          Arguments
                        </span>
                        <input
                          aria-label="Arguments de lancement"
                          value={launchArgs}
                          onChange={(e) => setLaunchArgs(e.target.value)}
                          placeholder="ex: --safe-mode --lang=fr"
                          style={{ ...inputTokens.base }}
                        />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 90, color: 'var(--text-muted)', fontSize: 13 }}>
                          CWD
                        </span>
                        <input
                          aria-label="Répertoire de travail"
                          value={launchCwd}
                          onChange={(e) => {
                            setLaunchCwd(e.target.value)
                            setCwdStatus('unknown')
                          }}
                          placeholder="Répertoire de travail"
                          style={{ ...inputTokens.base }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={testCwd}
                          title="Tester le dossier"
                        >
                          Tester
                        </Button>
                      </label>
                      {cwdStatus !== 'unknown' && (
                        <div
                          style={{
                            marginLeft: 90,
                            fontSize: 12,
                            color: cwdStatus === 'valid' ? '#10B981' : '#EF4444',
                          }}
                        >
                          {cwdStatus === 'valid' ? 'CWD valide' : 'CWD invalide'}
                        </div>
                      )}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 90, color: 'var(--text-muted)', fontSize: 13 }}>
                          Timeout
                        </span>
                        <input
                          aria-label="Timeout lancement (ms)"
                          type="number"
                          min={500}
                          max={20000}
                          step={100}
                          value={launchTimeoutMs}
                          onChange={(e) => setLaunchTimeoutMs(Number(e.target.value) || 1500)}
                          placeholder="1500"
                          style={{ ...inputTokens.base, width: 140 }}
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>ms</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          aria-label="Lancer en administrateur"
                          type="checkbox"
                          checked={launchAdmin}
                          onChange={(e) => setLaunchAdmin(e.target.checked)}
                        />
                        Lancer en administrateur
                      </label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Button
                          variant="warn"
                          onClick={async () => {
                            if (!window.electronAPI || !selectedApp?.executablePath) return
                            if (!isArgsValid(launchArgs)) {
                              showErrorNotification(
                                'Arguments invalides (guillemets non fermés ou trop longs)',
                              )
                              return
                            }
                            if (launchCwd) {
                              const ok = await window.electronAPI.checkFileExists(launchCwd)
                              if (!ok) {
                                showErrorNotification('CWD introuvable')
                                return
                              }
                            }
                            const args = launchArgs.trim()
                              ? launchArgs.match(/(?:[^\s"]+|"[^"]*")+/g) || []
                              : []
                            await window.electronAPI.launchPortable({
                              exePath: normalizePath(selectedApp.executablePath),
                              cwd: launchCwd || undefined,
                              args: args.map((a) => a.replace(/^"|"$/g, '')),
                              elevated: launchAdmin,
                              timeoutMs: launchTimeoutMs,
                            })
                            showSuccessNotification('Commande envoyée')
                          }}
                        >
                          Lancer avec options
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (!selectedApp) return
                            if (!isArgsValid(launchArgs)) {
                              showErrorNotification('Arguments invalides')
                              return
                            }
                            saveOpts(selectedApp.id, {
                              args: launchArgs,
                              cwd: launchCwd,
                              admin: launchAdmin,
                              timeoutMs: launchTimeoutMs,
                            })
                            showSuccessNotification('Options enregistrées par défaut')
                          }}
                        >
                          Enregistrer par défaut
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Message si pas d'informations détaillées */}
              {!appDetails[selectedApp.title] && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Info
                    size={48}
                    color="rgba(255, 255, 255, 0.3)"
                    style={{ marginBottom: '16px' }}
                  />
                  <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.7)' }}>
                    Informations détaillées non disponibles pour cette application.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => {
                      closeInfoModal()
                      handleLaunch(selectedApp.id)
                    }}
                    leftIcon={<Play size={20} />}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      margin: '20px auto 0 auto',
                    }}
                  >
                    Lancer l'application
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modale d'import .EXE */}
      <AnimatePresence>
        {importModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            onClick={() => setImportModal(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              style={{
                width: 'min(92vw, 560px)',
                background: 'rgba(25,25,25,0.98)',
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
                <strong>Importer un exécutable</strong>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setImportModal(null)}
                  title="Fermer"
                >
                  Fermer
                </Button>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                Fichier: {importModal.fileName}
              </div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                }}
              >
                Nom du dossier
              </label>
              <input
                value={importModal.folderName}
                onChange={(e) =>
                  setImportModal({ ...importModal, folderName: slugify(e.target.value) })
                }
                placeholder="Nom du dossier"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  marginBottom: 12,
                }}
              />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                Destination:{' '}
                {(rootDir || '…') +
                  ' \\ ' +
                  (importModal.folderName || 'dossier') +
                  ' \\ ' +
                  importModal.fileName}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button variant="outline" onClick={() => setImportModal(null)}>
                  Annuler
                </Button>
                <Button variant="primary" onClick={confirmImport}>
                  Importer
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Journal des lancements */}
      <div style={{ marginTop: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <strong>{t('launch_log') || 'Journal des lancements'}</strong>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="outline" onClick={() => setPortableLogs([])}>
              Effacer
            </Button>
            <Button size="sm" variant="outline" onClick={exportPortableLogs} title="Exporter logs">
              Exporter logs
            </Button>
          </div>
        </div>
        <div
          style={{
            ...surface.muted,
            maxHeight: 200,
            overflow: 'auto',
            padding: 10,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 12,
          }}
        >
          {portableLogs.length === 0
            ? 'Aucun message.'
            : portableLogs.map((l, i) => (
                <div
                  key={i}
                  style={{
                    color:
                      l.type === 'error'
                        ? '#EF4444'
                        : l.type === 'warn'
                          ? '#F59E0B'
                          : l.type === 'success'
                            ? '#10B981'
                            : '#E5E7EB',
                  }}
                >
                  [{new Date(l.ts).toLocaleTimeString()}] {l.message}
                </div>
              ))}
        </div>
      </div>
    </div>
  )
}

export default PortableAppsPage
