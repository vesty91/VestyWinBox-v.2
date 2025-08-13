import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Package,
  Smartphone,
  BarChart3,
  Settings,
  FileText,
  HardDrive,
  Menu,
  X,
  Sparkles,
} from 'lucide-react'
import './VIPLayout.css'
import Button from '../../ui/components/Button'
// i18n supprimé: FR uniquement
import { surface } from '../../ui/styles/tokens'

interface VIPLayoutProps {
  children: React.ReactNode
}

interface NavItem {
  path: string
  label: string
  icon: React.ComponentType<any>
  gradient: string
}

type ThemeName = 'dark' | 'light' | 'gold' | 'neon'

const navItems: NavItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    icon: Home,
    gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
  },
  {
    path: '/software',
    label: 'Logiciels',
    icon: Package,
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
  },
  {
    path: '/portable-apps',
    label: 'Apps Portables',
    icon: Smartphone,
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  },
  {
    path: '/analytics',
    label: 'Analytics',
    icon: BarChart3,
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  },
  {
    path: '/god-mode',
    label: 'God Mode',
    icon: Settings,
    gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
  },
  {
    path: '/file-converter',
    label: 'Convertisseur',
    icon: FileText,
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  },
  {
    path: '/nas-explorer',
    label: 'NAS Explorer',
    icon: HardDrive,
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
  },
  {
    path: '/chocolatey',
    label: 'Chocolatey',
    icon: Package,
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  },
]

const VIPLayout: React.FC<VIPLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [lockSidebar, setLockSidebar] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vwbox_lock_sidebar') === '1'
    } catch {
      return false
    }
  })
  const [updateState, setUpdateState] = useState<{
    status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'none' | 'error'
    progress?: number
    err?: string
    info?: any
  }>({ status: 'idle' })
  const [theme, setTheme] = useState<ThemeName>(() => {
    const stored = localStorage.getItem('vwbox_theme') as ThemeName | 'emerald' | null
    if (stored === 'emerald') return 'gold'
    return (stored as ThemeName) || 'dark'
  })
  const [currentTime, setCurrentTime] = useState(new Date())
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('vwbox_theme', theme)
  }, [theme])

  // Auto‑update listeners
  useEffect(() => {
    const api: any = (window as any).electronAPI
    if (!api?.onUpdateChecking) return
    const onCheck = () => setUpdateState({ status: 'checking' })
    const onAvail = (info: any) => setUpdateState({ status: 'available', info })
    const onNone = () => setUpdateState({ status: 'none' })
    const onErr = (e: any) => setUpdateState({ status: 'error', err: String(e) })
    const onProg = (p: any) =>
      setUpdateState({ status: 'downloading', progress: Math.round(p?.percent || 0) })
    const onDl = (info: any) => setUpdateState({ status: 'downloaded', info })
    api.onUpdateChecking(onCheck)
    api.onUpdateAvailable(onAvail)
    api.onUpdateNone(onNone)
    api.onUpdateError(onErr)
    api.onUpdateProgress(onProg)
    api.onUpdateDownloaded(onDl)
    // Trigger silent check once on mount (prod)
    api.updateCheck?.()
    return () => {
      try {
        api.offUpdate('update:checking', onCheck)
      } catch {}
      try {
        api.offUpdate('update:available', onAvail)
      } catch {}
      try {
        api.offUpdate('update:none', onNone)
      } catch {}
      try {
        api.offUpdate('update:error', onErr)
      } catch {}
      try {
        api.offUpdate('update:progress', onProg)
      } catch {}
      try {
        api.offUpdate('update:downloaded', onDl)
      } catch {}
    }
  }, [])

  // Si l’utilisateur a choisi "Suivre Windows", synchroniser au lancement et sur changements
  useEffect(() => {
    try {
      const raw = localStorage.getItem('vw_settings')
      const s = raw ? JSON.parse(raw) : null
      if (s?.themeMode === 'follow') {
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const apply = () => setTheme(mq.matches ? 'dark' : 'light')
        apply()
        mq.addEventListener?.('change', apply)
        return () => mq.removeEventListener?.('change', apply)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('vw_settings')
      const s = raw ? JSON.parse(raw) : null
      if (s?.applyOnStartup) {
        if (s?.portableRoot && (window as any).electronAPI?.setPortableRootDir) {
          ;(window as any).electronAPI.setPortableRootDir(s.portableRoot)
        }
        if (s?.conversionsDir) {
          localStorage.setItem('vw_conversions_dir', s.conversionsDir)
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const formatDate = (date: Date) =>
    date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const toggleLockSidebar = () => {
    const next = !lockSidebar
    setLockSidebar(next)
    try {
      localStorage.setItem('vwbox_lock_sidebar', next ? '1' : '0')
    } catch {}
    if (next) setIsSidebarOpen(true)
  }
  const handleNavigation = (path: string) => {
    navigate(path)
    setIsSidebarOpen(false)
  }
  const currentNavItem = navItems.find((item) => item.path === location.pathname) || navItems[0]

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Variables de thème appliquées via data-theme dans VIPLayout.css */}
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Background décoratif */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            background: 'var(--bg-decor)',
          }}
        />

        {/* Bannière de mise à jour */}
        {updateState.status !== 'idle' && updateState.status !== 'none' && (
          <div
            style={{
              position: 'fixed',
              top: 80,
              left: isSidebarOpen || lockSidebar ? 280 : 0,
              right: 0,
              zIndex: 1000,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                ...surface.muted,
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span style={{ color: '#fff', fontWeight: 600 }}>
                {updateState.status === 'checking' && 'Vérification des mises à jour…'}
                {updateState.status === 'available' && 'Mise à jour disponible'}
                {updateState.status === 'downloading' &&
                  `Téléchargement… ${updateState.progress || 0}%`}
                {updateState.status === 'downloaded' && 'Mise à jour téléchargée'}
                {updateState.status === 'error' && `Erreur mise à jour: ${updateState.err}`}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {updateState.status === 'available' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => (window as any).electronAPI.updateDownload()}
                  >
                    Télécharger
                  </Button>
                )}
                {updateState.status === 'downloaded' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => (window as any).electronAPI.updateInstallNow()}
                  >
                    Installer maintenant
                  </Button>
                )}
                {updateState.status === 'error' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => (window as any).electronAPI.updateCheck()}
                  >
                    Réessayer
                  </Button>
                )}
                {(['idle', 'none', 'error'] as const).includes(updateState.status as any) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => (window as any).electronAPI.updateCheck()}
                  >
                    Vérifier
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'var(--header-bg)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border)',
            padding: '16px 24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              margin: 0,
            }}
          >
            {/* Logo et titre */}
            <motion.div
              style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
              whileHover={{ scale: 1.05 }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '18px',
                  background: 'var(--tile-bg)',
                  border: '1px solid var(--border-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <currentNavItem.icon size={36} color="var(--icon)" />
                <motion.div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background:
                      'linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.12), transparent)',
                    transform: 'translateX(-100%)',
                  }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                />
              </div>
              <div>
                <h1
                  style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    margin: 0,
                    backgroundImage: currentNavItem.gradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  VestyWinBox
                </h1>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <Sparkles size={12} /> Gestionnaire Système Windows
                </p>
              </div>
            </motion.div>

            {/* Heure et date */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '4px',
              }}
            >
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {formatTime(currentTime)}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {formatDate(currentTime)}
              </div>
            </div>

            {/* Boutons d'action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  ...surface.muted,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: 8,
                  padding: 4,
                }}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setTheme('dark')}
                  title="Thème sombre"
                  style={{ background: theme === 'dark' ? 'var(--accent)' : 'transparent' }}
                >
                  Sombre
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setTheme('light')}
                  title="Thème clair"
                  style={{ background: theme === 'light' ? 'var(--accent)' : 'transparent' }}
                >
                  Clair
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setTheme('gold')}
                  title="Thème or"
                  style={{ background: theme === 'gold' ? 'var(--accent)' : 'transparent' }}
                >
                  Gold
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setTheme('neon')}
                  title="Thème néon"
                  style={{ background: theme === 'neon' ? 'var(--accent)' : 'transparent' }}
                >
                  Néon
                </Button>
              </div>
              {/* Toggle langue retiré: FR uniquement */}
              <Button
                onClick={toggleLockSidebar}
                title={
                  lockSidebar ? 'Déverrouiller la barre latérale' : 'Verrouiller la barre latérale'
                }
                variant={lockSidebar ? 'primary' : 'outline'}
              >
                {lockSidebar ? 'Verrouillé' : 'Verrouiller'}
              </Button>
              <Button onClick={() => navigate('/settings')} variant="outline" title="Paramètres">
                Paramètres
              </Button>
              <Button
                onClick={toggleSidebar}
                ariaLabel="Menu de navigation"
                variant="outline"
                style={{ padding: 8 }}
              >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </Button>
            </div>
          </div>
        </motion.header>

        {/* Sidebar */}
        <AnimatePresence>
          {(isSidebarOpen || lockSidebar) && (
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '280px',
                height: '100vh',
                background: 'var(--sidebar-bg)',
                backdropFilter: 'blur(20px)',
                borderRight: '1px solid var(--border)',
                zIndex: 999,
                paddingTop: '80px',
              }}
            >
              <nav style={{ padding: '24px' }}>
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path
                    return (
                      <motion.li key={item.path} whileHover={{ x: 8 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={() => handleNavigation(item.path)}
                          fullWidth
                          variant="ghost"
                          style={{
                            background: isActive ? item.gradient : 'transparent',
                            border: 'none',
                            borderRadius: 12,
                            padding: 16,
                            display: 'flex',
                            justifyContent: 'flex-start',
                            gap: 12,
                            fontWeight: isActive ? 600 : 500,
                          }}
                        >
                          <item.icon size={20} />
                          {item.label}
                        </Button>
                      </motion.li>
                    )
                  })}
                </ul>
              </nav>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Overlay pour fermer le sidebar */}
        <AnimatePresence>
          {isSidebarOpen && !lockSidebar && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleSidebar}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                zIndex: 998,
              }}
            />
          )}
        </AnimatePresence>

        {/* Contenu principal */}
        <main
          style={{
            paddingTop: '80px',
            minHeight: 'calc(100vh - 80px)',
            paddingLeft: isSidebarOpen || lockSidebar ? '280px' : '0',
            transition: 'padding-left 0.3s ease',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <AnimatePresence mode="sync">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.995 }}
              transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                width: '100%',
                margin: 0,
                padding: '24px',
                minHeight: 'calc(100vh - 128px)',
                position: 'relative',
                zIndex: 2,
              }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default VIPLayout
