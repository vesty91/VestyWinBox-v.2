import { motion } from 'framer-motion'
import {
  BarChart3,
  Cpu,
  FileText,
  HardDrive,
  MemoryStick,
  Package,
  Settings,
  Smartphone,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { t } from '../../i18n'
import Button from '../../ui/components/Button'
import { surface } from '../../ui/styles/tokens'

const VIPDashboard: React.FC = () => {
  const [systemStats, setSystemStats] = useState({ cpu: 0, memory: 0, disk: 0, network: 0 })
  const [sysInfo, setSysInfo] = useState<{
    platform?: string
    arch?: string
    version?: string
    cpuCount?: number
    cpuModel?: string
    totalMemory?: number
    freeMemory?: number
  } | null>(null)

  // Tirer les stats en temps réel si l'API Electron est dispo, sinon fallback simulé
  useEffect(() => {
    let timer: any
    const pull = async () => {
      try {
        const r = await (window as any).electronAPI?.getRealtimeAnalytics?.()
        if (r) {
          setSystemStats({
            cpu: r.cpu,
            memory: r.memory,
            disk: r.disk,
            network: Math.min(100, Math.round((r.networkKbps || 0) / 10)),
          })
          return
        }
      } catch {}
      setSystemStats((prev) => ({
        cpu: Math.min(100, Math.max(0, prev.cpu + (Math.random() * 10 - 5))),
        memory: Math.min(100, Math.max(0, prev.memory + (Math.random() * 8 - 4))),
        disk: Math.min(100, Math.max(0, prev.disk + (Math.random() * 6 - 3))),
        network: Math.min(100, Math.max(0, prev.network + (Math.random() * 12 - 6))),
      }))
    }
    pull()
    timer = setInterval(pull, 2000)
    return () => timer && clearInterval(timer)
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const info = await (window as any).electronAPI?.getSystemInfo?.()
        if (info) setSysInfo(info)
      } catch {}
    })()
  }, [])

  const prettyGB = (n?: number) => (typeof n === 'number' ? `${n.toFixed(2)} GB` : '—')
  const formatPct = (n: number) => `${Number(n || 0).toFixed(2)}%`

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* En‑tête professionnel */}
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        style={{ marginBottom: 24 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 32,
                fontWeight: 900,
                backgroundImage: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
              }}
            >
              Bienvenue sur VestyWinBox
            </h1>
            <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
              Centre de contrôle système Windows — sobre, rapide, professionnel
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/settings')}
              title="Paramètres"
            >
              <Settings size={16} />
              &nbsp;Paramètres
            </Button>
            <Button
              variant="ghost"
              onClick={() => (window.location.href = '/software')}
              style={{
                background: 'linear-gradient(135deg,#3B82F6 0%, #2563EB 100%)',
                border: 'none',
              }}
            >
              <Package size={16} />
              &nbsp;Logiciels
            </Button>
            <Button
              variant="ghost"
              onClick={() => (window.location.href = '/portable-apps')}
              style={{
                background: 'linear-gradient(135deg,#10B981 0%, #059669 100%)',
                border: 'none',
              }}
            >
              <Smartphone size={16} />
              &nbsp;Apps Portables
            </Button>
            <Button
              variant="ghost"
              onClick={() => (window.location.href = '/file-converter')}
              style={{
                background: 'linear-gradient(135deg,#F59E0B 0%, #D97706 100%)',
                border: 'none',
              }}
            >
              <FileText size={16} />
              &nbsp;Convertisseur
            </Button>
            <Button
              variant="ghost"
              onClick={() => (window.location.href = '/analytics')}
              style={{
                background: 'linear-gradient(135deg,#8B5CF6 0%, #7C3AED 100%)',
                border: 'none',
              }}
            >
              <BarChart3 size={16} />
              &nbsp;Analytics
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Indicateurs clés (sans tuiles) */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { icon: Cpu, label: 'CPU', value: systemStats.cpu as number, color: '#3B82F6' },
          {
            icon: MemoryStick,
            label: 'RAM',
            value: systemStats.memory as number,
            color: '#10B981',
          },
          { icon: HardDrive, label: 'Disque', value: systemStats.disk as number, color: '#F59E0B' },
          {
            icon: BarChart3,
            label: 'Réseau',
            value: systemStats.network as number,
            color: '#8B5CF6',
          },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            style={{
              ...surface.muted,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: kpi.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <kpi.icon size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>
                  {formatPct(kpi.value as number)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{kpi.label}</div>
              </div>
            </div>
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.max(8, Math.min(100, Math.round((kpi.value as number) || 0)))}%`,
              }}
              transition={{ duration: 0.5 }}
              style={{
                height: 6,
                background: `${kpi.color}55`,
                borderRadius: 999,
                flex: 1,
                marginLeft: 12,
              }}
            />
          </motion.div>
        ))}
      </section>

      {/* Deux colonnes informatives */}
      <section
        style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'start' }}
      >
        {/* Colonne gauche: sections descriptives (liens, sans tuiles) */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          style={{ display: 'grid', gap: 12 }}
        >
          <div style={{ ...surface.muted, padding: 18 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Fonctionnalités clés</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 12, display: 'grid', gap: 10 }}>
              {[
                {
                  label: 'Gestion des logiciels',
                  desc: 'Installer, mettre à jour et gérer vos applications en un clic.',
                  href: '/software',
                  color: '#3B82F6',
                  icon: Package,
                },
                {
                  label: 'Applications portables',
                  desc: 'Lancez des apps sans installation & sauvegardez vos préférées.',
                  href: '/portable-apps',
                  color: '#10B981',
                  icon: Smartphone,
                },
                {
                  label: 'Convertisseur de fichiers',
                  desc: 'Convertissez vidéos, images, audio, documents, archives.',
                  href: '/file-converter',
                  color: '#F59E0B',
                  icon: FileText,
                },
                {
                  label: 'Analytics système',
                  desc: 'Visualisez CPU, RAM, disque, réseau en temps réel.',
                  href: '/analytics',
                  color: '#8B5CF6',
                  icon: BarChart3,
                },
              ].map((row, idx) => (
                <li key={row.label}>
                  <button
                    onClick={() => (window.location.href = row.href)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 12,
                      padding: 12,
                      cursor: 'pointer',
                    }}
                    aria-label={row.label}
                  >
                    <span
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: row.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <row.icon size={18} color="#fff" />
                    </span>
                    <span style={{ display: 'grid', gap: 4 }}>
                      <strong>{row.label}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{row.desc}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ ...surface.muted, padding: 18 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Conseils rapides</h2>
            <ol style={{ margin: '12px 16px', padding: 0 }}>
              <li>Utilisez la page God Mode pour les réglages Windows avancés.</li>
              <li>Activez les sauvegardes régulières et gardez vos pilotes à jour.</li>
              <li>Optimisez votre démarrage en désactivant les apps non essentielles.</li>
            </ol>
          </div>
        </motion.div>

        {/* Colonne droite: info système concise */}
        <motion.aside
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          style={{ display: 'grid', gap: 12 }}
        >
          <div style={{ ...surface.muted, padding: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Système</h3>
            <div style={{ display: 'grid', gap: 8, marginTop: 10, fontSize: 13 }}>
              <div>OS: {sysInfo ? `${sysInfo.platform} ${sysInfo.version}` : '—'}</div>
              <div>Arch: {sysInfo?.arch || '—'}</div>
              <div>
                CPU: {sysInfo?.cpuModel || '—'} ({sysInfo?.cpuCount || '—'} cœurs)
              </div>
              <div>
                Mémoire: {prettyGB(sysInfo?.totalMemory)} • Libre: {prettyGB(sysInfo?.freeMemory)}
              </div>
            </div>
          </div>
          <div style={{ ...surface.muted, padding: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Raccourcis utiles</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <Button variant="outline" onClick={() => (window.location.href = '/god-mode')}>
                God Mode
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = '/chocolatey')}>
                Chocolatey
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = '/nas-explorer')}>
                NAS
              </Button>
            </div>
          </div>
        </motion.aside>
      </section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{ marginTop: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}
      >
        {t('footer_version_prefix') || 'VestyWinBox'} v1.0.0 •{' '}
        {t('footer_last_update') || 'Dernière mise à jour'}:{' '}
        {new Date().toLocaleDateString('fr-FR')}
      </motion.footer>
    </div>
  )
}

export default VIPDashboard
