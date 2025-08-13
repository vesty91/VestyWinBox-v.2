import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Package,
  Smartphone,
  BarChart3,
  Settings,
  FileText,
  HardDrive,
  Shield,
  Zap,
  Database,
  Monitor,
  Heart,
  Star,
  TrendingUp,
  Cpu,
  MemoryStick,
  LucideIcon,
} from 'lucide-react'
import UnifiedTile from '../../components/UnifiedTile/UnifiedTile'
import Button from '../../ui/components/Button'
import { t } from '../../i18n'
import { surface } from '../../ui/styles/tokens'

interface DashboardTile {
  id: string
  title: string
  description: string
  icon: LucideIcon
  gradient: string
  action: () => void
  actionText: string
  actionIcon: LucideIcon
  status: 'available' | 'installing' | 'installed' | 'launch' | 'info'
  stats?: {
    value: string
    label: string
    trend?: 'up' | 'down' | 'stable'
  }
}

const VIPDashboard: React.FC = () => {
  const [systemStats, setSystemStats] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
  })

  useEffect(() => {
    // Simulation des statistiques système
    const updateStats = () => {
      setSystemStats({
        cpu: Math.floor(Math.random() * 30) + 20,
        memory: Math.floor(Math.random() * 40) + 30,
        disk: Math.floor(Math.random() * 20) + 10,
        network: Math.floor(Math.random() * 50) + 20,
      })
    }

    updateStats()
    const interval = setInterval(updateStats, 3000)

    return () => clearInterval(interval)
  }, [])

  const dashboardTiles: DashboardTile[] = [
    {
      id: 'software',
      title: 'Gestion Logiciels',
      description: 'Installez, mettez à jour et gérez vos applications système.',
      icon: Package,
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
      action: () => (window.location.href = '/software'),
      actionText: 'Gérer',
      actionIcon: Package,
      status: 'available',
      stats: { value: '24', label: 'Logiciels installés' },
    },
    {
      id: 'portable',
      title: 'Apps Portables',
      description: 'Lancez vos applications portables sans installation.',
      icon: Smartphone,
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      action: () => (window.location.href = '/portable-apps'),
      actionText: 'Lancer',
      actionIcon: Smartphone,
      status: 'launch',
      stats: { value: '8', label: 'Apps disponibles' },
    },
    {
      id: 'analytics',
      title: 'Analytics Système',
      description: "Surveillez les performances et l'utilisation des ressources.",
      icon: BarChart3,
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      action: () => (window.location.href = '/analytics'),
      actionText: 'Voir',
      actionIcon: BarChart3,
      status: 'available',
      stats: { value: `${systemStats.cpu}%`, label: 'CPU', trend: 'up' },
    },
    {
      id: 'god-mode',
      title: 'God Mode',
      description: "Accès avancé aux paramètres système et outils d'administration.",
      icon: Settings,
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      action: () => (window.location.href = '/god-mode'),
      actionText: 'Ouvrir',
      actionIcon: Settings,
      status: 'info',
    },
    {
      id: 'converter',
      title: 'Convertisseur Fichiers',
      description: 'Convertissez vos fichiers entre différents formats rapidement.',
      icon: FileText,
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      action: () => (window.location.href = '/file-converter'),
      actionText: 'Convertir',
      actionIcon: FileText,
      status: 'available',
    },
    {
      id: 'nas',
      title: 'NAS Explorer',
      description: 'Explorez et gérez vos serveurs NAS et stockage réseau.',
      icon: HardDrive,
      gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
      action: () => (window.location.href = '/nas-explorer'),
      actionText: 'Explorer',
      actionIcon: HardDrive,
      status: 'available',
    },
    {
      id: 'security',
      title: 'Sécurité Système',
      description: 'Analysez et renforcez la sécurité de votre système.',
      icon: Shield,
      gradient: 'linear-gradient(135deg, #84CC16 0%, #65A30D 100%)',
      action: () => {},
      actionText: 'Analyser',
      actionIcon: Shield,
      status: 'available',
      stats: { value: '95%', label: 'Sécurité', trend: 'stable' },
    },
    {
      id: 'optimization',
      title: 'Optimisation',
      description: 'Optimisez les performances et nettoyez votre système.',
      icon: Zap,
      gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
      action: () => {},
      actionText: 'Optimiser',
      actionIcon: Zap,
      status: 'available',
      stats: { value: `${systemStats.memory}%`, label: 'RAM', trend: 'down' },
    },
    {
      id: 'backup',
      title: 'Sauvegarde',
      description: 'Créez et gérez vos sauvegardes système automatiques.',
      icon: Database,
      gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
      action: () => {},
      actionText: 'Sauvegarder',
      actionIcon: Database,
      status: 'available',
    },
    {
      id: 'monitoring',
      title: 'Monitoring',
      description: "Surveillez en temps réel l'état de votre système.",
      icon: Monitor,
      gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
      action: () => {},
      actionText: 'Surveiller',
      actionIcon: Monitor,
      status: 'available',
      stats: { value: `${systemStats.disk}%`, label: 'Disque', trend: 'stable' },
    },
    {
      id: 'health',
      title: 'Santé Système',
      description: 'Diagnostiquez et réparez les problèmes système.',
      icon: Heart,
      gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
      action: () => {},
      actionText: 'Diagnostiquer',
      actionIcon: Heart,
      status: 'available',
      stats: { value: 'Excellent', label: 'État', trend: 'up' },
    },
    {
      id: 'favorites',
      title: 'Favoris',
      description: 'Accédez rapidement à vos outils et applications préférés.',
      icon: Star,
      gradient: 'linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)',
      action: () => {},
      actionText: 'Voir',
      actionIcon: Star,
      status: 'available',
      stats: { value: '12', label: 'Favoris' },
    },
  ]

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* En-tête du Dashboard (refonte) */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        style={{
          marginBottom: '28px',
          padding: '12px 0',
        }}
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
          {/* Branding + tagline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 280 }}>
            <img
              src={'/assets/branding/logo.png'}
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).src = '/assets/branding/logo.jpeg'
              }}
              alt="VestyWinBox"
              style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 12 }}
            />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 0.2 }}>VestyWinBox</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {t('dashboard_tagline') ||
                  'Centre de contrôle système • Outils, analytics, portables'}
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button
              variant="ghost"
              onClick={() => (window.location.href = '/portable-apps')}
              style={{
                background: 'linear-gradient(135deg,#10B981 0%,#059669 100%)',
                border: 'none',
              }}
            >
              {t('quick_portable_apps') || 'Apps Portables'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => (window.location.href = '/god-mode')}
              style={{
                background: 'linear-gradient(135deg,#EF4444 0%,#DC2626 100%)',
                border: 'none',
              }}
            >
              {t('quick_godmode') || 'God Mode'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => (window.location.href = '/chocolatey')}
              style={{
                background: 'linear-gradient(135deg,#3B82F6 0%,#2563EB 100%)',
                border: 'none',
              }}
            >
              {t('quick_chocolatey') || 'Chocolatey'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => (window.location.href = '/file-converter')}
              style={{
                background: 'linear-gradient(135deg,#F59E0B 0%,#D97706 100%)',
                border: 'none',
              }}
            >
              {t('quick_converter') || 'Convertisseur'}
            </Button>
          </div>
        </div>

        {/* Cartes métriques sobres */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginTop: 16,
          }}
        >
          {[
            { icon: Cpu, label: 'CPU', value: `${systemStats.cpu}%`, color: '#3B82F6' },
            { icon: MemoryStick, label: 'RAM', value: `${systemStats.memory}%`, color: '#10B981' },
            { icon: HardDrive, label: 'Disque', value: `${systemStats.disk}%`, color: '#F59E0B' },
            {
              icon: TrendingUp,
              label: 'Réseau',
              value: `${systemStats.network}%`,
              color: '#8B5CF6',
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
              style={{
                ...surface.muted,
                padding: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: stat.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <stat.icon size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Grille des tuiles d'action */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '24px',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        {dashboardTiles.map((tile, index) => (
          <UnifiedTile
            key={tile.title}
            title={tile.title}
            description={tile.description}
            icon={tile.icon}
            status={tile.status}
            onAction={tile.action}
            onLaunch={tile.action}
            index={index}
          />
        ))}
      </div>

      {/* Footer avec informations système */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        style={{
          marginTop: '48px',
          padding: '24px',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
          {t('footer_version_prefix') || 'VestyWinBox'} v1.0.0 •{' '}
          {t('footer_last_update') || 'Dernière mise à jour'}:{' '}
          {new Date().toLocaleDateString('fr-FR')}
        </p>
      </motion.div>
    </div>
  )
}

export default VIPDashboard
