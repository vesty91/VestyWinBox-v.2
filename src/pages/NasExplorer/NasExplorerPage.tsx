import React from 'react'
import { motion } from 'framer-motion'
import {
  HardDrive,
  Network,
  Folder,
  Upload,
  Download,
  Settings,
  Server,
  Database,
} from 'lucide-react'
import UnifiedTile from '../../components/UnifiedTile/UnifiedTile'

const NasExplorerPage: React.FC = () => {
  const nasTools = [
    {
      id: 'nas-browser',
      title: 'Explorateur NAS',
      description: 'Parcourez et gérez vos serveurs NAS et stockage réseau.',
      icon: HardDrive,
      status: 'available' as const,
      action: () => {},
      actionText: 'Explorer',
      actionIcon: Folder,
    },
    {
      id: 'nas-sync',
      title: 'Synchronisation NAS',
      description: 'Synchronisez vos fichiers avec vos serveurs NAS automatiquement.',
      icon: Network,
      status: 'available' as const,
      action: () => {},
      actionText: 'Synchroniser',
      actionIcon: Upload,
    },
    {
      id: 'nas-backup',
      title: 'Sauvegarde NAS',
      description: 'Créez des sauvegardes automatiques vers vos serveurs NAS.',
      icon: Database,
      status: 'available' as const,
      action: () => {},
      actionText: 'Sauvegarder',
      actionIcon: Download,
    },
    {
      id: 'nas-monitor',
      title: 'Monitoring NAS',
      description: "Surveillez l'état et les performances de vos serveurs NAS.",
      icon: Server,
      status: 'available' as const,
      action: () => {},
      actionText: 'Surveiller',
      actionIcon: Settings,
    },
    {
      id: 'nas-config',
      title: 'Configuration NAS',
      description: 'Configurez les connexions et paramètres de vos serveurs NAS.',
      icon: Settings,
      status: 'available' as const,
      action: () => {},
      actionText: 'Configurer',
      actionIcon: Settings,
    },
    {
      id: 'nas-transfer',
      title: 'Transfert de fichiers',
      description: 'Transférez des fichiers vers et depuis vos serveurs NAS.',
      icon: Upload,
      status: 'available' as const,
      action: () => {},
      actionText: 'Transférer',
      actionIcon: Upload,
    },
  ]

  return (
    <div style={{ minHeight: '100vh' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ marginBottom: '32px' }}
      >
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
              background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HardDrive size={28} color="white" />
          </div>
          <div>
            <h1
              style={{
                fontSize: '36px',
                fontWeight: '800',
                margin: '0 0 8px 0',
                background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              NAS Explorer
            </h1>
            <p
              style={{
                fontSize: '16px',
                color: 'rgba(255, 255, 255, 0.7)',
                margin: 0,
              }}
            >
              Explorez et gérez vos serveurs NAS et stockage réseau
            </p>
          </div>
        </div>
      </motion.div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '24px',
        }}
      >
        {nasTools.map((tool, index) => (
          <UnifiedTile
            key={tool.title}
            title={tool.title}
            description={tool.description}
            icon={tool.icon}
            status={tool.status}
            onAction={tool.action}
            onLaunch={tool.action}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}

export default NasExplorerPage
