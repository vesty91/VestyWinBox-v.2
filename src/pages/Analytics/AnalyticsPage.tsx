import { motion } from 'framer-motion'
import { Activity, BarChart3, Cpu, HardDrive, MemoryStick, Network } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { surface } from '../../ui/styles/tokens'

const AnalyticsPage: React.FC = () => {
  const [systemStats, setSystemStats] = useState({ cpu: 0, memory: 0, disk: 0, network: 0 })
  const [history, setHistory] = useState<
    Array<{ timestamp: number; cpu: number; memory: number; disk: number; network: number }>
  >([])
  const [sysInfo, setSysInfo] = useState<{
    platform?: string
    arch?: string
    version?: string
    totalMemory?: number
    freeMemory?: number
    cpuCount?: number
    cpuModel?: string
  } | null>(null)

  useEffect(() => {
    const pull = async () => {
      try {
        const r = await window.electronAPI.getRealtimeAnalytics()
        if (r) {
          const newStats = {
            cpu: r.cpu,
            memory: r.memory,
            disk: r.disk,
            network: Math.min(100, Math.round((r.networkKbps || 0) / 10)),
          }
          setSystemStats(newStats)
          setHistory((prev) => [...prev.slice(-120), { ...newStats, timestamp: Date.now() }])
        }
      } catch {}
    }
    pull()
    const id = setInterval(pull, 2000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const loadSys = async () => {
      try {
        setSysInfo(await window.electronAPI.getSystemInfo())
      } catch {}
    }
    loadSys()
  }, [])

  const getStatusColor = (value: number) =>
    value < 50 ? '#10B981' : value < 80 ? '#F59E0B' : '#EF4444'
  const getStatusText = (value: number) =>
    value < 50 ? 'Normal' : value < 80 ? 'Élevé' : 'Critique'

  const prettyGB = (n?: number) => (typeof n === 'number' ? `${n.toFixed(2)} GB` : '—')

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* En-tête */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ marginBottom: '24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: 'var(--tile-bg)',
              border: '1px solid var(--border-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BarChart3 size={32} color="var(--icon)" />
          </div>
          <div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 800,
                margin: 0,
                backgroundImage: 'linear-gradient(135deg,#8B5CF6 0%, #7C3AED 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Analytics Système
            </h1>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>Performances en temps réel</p>
          </div>
        </div>
      </motion.div>

      {/* Métriques en temps réel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          {
            icon: Cpu,
            label: 'CPU',
            value: systemStats.cpu,
            unit: '%',
            color: '#3B82F6',
            description: 'Utilisation du processeur',
          },
          {
            icon: MemoryStick,
            label: 'RAM',
            value: systemStats.memory,
            unit: '%',
            color: '#10B981',
            description: 'Utilisation de la mémoire',
          },
          {
            icon: HardDrive,
            label: 'Disque',
            value: systemStats.disk,
            unit: '%',
            color: '#F59E0B',
            description: 'Utilisation du disque (C:)',
          },
          {
            icon: Network,
            label: 'Réseau',
            value: systemStats.network,
            unit: '%',
            color: '#8B5CF6',
            description: 'Débit réseau (normalisé)',
          },
        ].map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.05 }}
            style={{ ...surface.muted, padding: 20 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: metric.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <metric.icon size={20} color="#fff" />
                </div>
                <div style={{ fontWeight: 700 }}>{metric.label}</div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: getStatusColor(metric.value),
                  fontWeight: 700,
                  padding: '4px 8px',
                  background: `${getStatusColor(metric.value)}20`,
                  borderRadius: 6,
                }}
              >
                {getStatusText(metric.value)}
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
              {metric.value}
              {metric.unit}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              {metric.description}
            </div>
            <div
              style={{
                width: '100%',
                height: 6,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, Math.min(100, metric.value || 0))}%` }}
                transition={{ duration: 0.4 }}
                style={{ height: '100%', background: metric.color }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Graphiques d'historique */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          { label: 'CPU', data: history.map((h) => h.cpu), color: '#3B82F6' },
          { label: 'RAM', data: history.map((h) => h.memory), color: '#10B981' },
          { label: 'Disque', data: history.map((h) => h.disk), color: '#F59E0B' },
          { label: 'Réseau', data: history.map((h) => h.network), color: '#8B5CF6' },
        ].map((chart, index) => (
          <motion.div
            key={chart.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
            style={{ ...surface.muted, padding: 20 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>{chart.label} - Historique</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {history.length} points
              </span>
            </div>
            <div
              style={{
                height: 200,
                display: 'flex',
                alignItems: 'flex-end',
                gap: 2,
                padding: '12px 0',
              }}
            >
              {chart.data.slice(-60).map((value, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${value}%` }}
                  transition={{ duration: 0.25, delay: i * 0.01 }}
                  style={{ flex: 1, background: chart.color, borderRadius: 2, minHeight: 2 }}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Informations système (réelles) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        style={{ ...surface.muted, padding: 24 }}
      >
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            margin: '0 0 12px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Activity size={20} color="#8B5CF6" /> Informations Système
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {[
            { label: 'OS', value: sysInfo ? `${sysInfo.platform} ${sysInfo.version}` : '—' },
            { label: 'Architecture', value: sysInfo?.arch || '—' },
            { label: 'Processeur', value: sysInfo?.cpuModel || '—' },
            { label: 'Cœurs CPU', value: sysInfo?.cpuCount?.toString() || '—' },
            { label: 'Mémoire totale', value: prettyGB(sysInfo?.totalMemory) },
            { label: 'Mémoire libre', value: prettyGB(sysInfo?.freeMemory) },
          ].map((info) => (
            <div key={info.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                {info.label}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{info.value}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

export default AnalyticsPage
