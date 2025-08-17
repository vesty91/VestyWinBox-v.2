import { motion } from 'framer-motion'
import { Info, LucideIcon, Play, ShieldAlert } from 'lucide-react'
import React from 'react'
import './UnifiedTile.css'

export interface UnifiedTileProps {
  title: string
  version?: string
  size?: string
  description: string
  icon: LucideIcon
  status: 'available' | 'installing' | 'installed' | 'launch' | 'info'
  onAction: () => void
  onLaunch?: () => void
  onLaunchAdmin?: () => void
  index?: number
  iconPath?: string
}

const UnifiedTile: React.FC<UnifiedTileProps> = ({
  title,
  version,
  size,
  description,
  icon: Icon,
  status,
  onAction,
  onLaunch,
  onLaunchAdmin,
  index = 0,
  iconPath,
}) => {
  // Normalize icon source for packaged Electron app:
  // - keep absolute file:// URLs
  // - remove any leading slash so '/assets/..' becomes 'assets/..' (relative to dist/index.html)
  // - collapse duplicate 'assets/assets' if it occurs
  const resolvedIconSrc = React.useMemo(() => {
    if (!iconPath) return undefined
    if (iconPath.startsWith('file://')) return iconPath
    let p = iconPath.replace(/^\/+/, '')
    p = p.replace(/\/+/g, '/')
    p = p.replace(/^(assets\/)?assets\//, 'assets/')
    // Build absolute file URL: file:///C:/.../resources/dist/ + assets/...
    try {
      const pathname = window.location.pathname.replace(/\\/g, '/')
      const distDir = pathname.replace(/\/index\.html.*$/i, '/')
      return `file://${distDir}${p}`
    } catch {
      return p
    }
  }, [iconPath])
  const getStatusText = () => {
    switch (status) {
      case 'available':
        return 'Disponible'
      case 'installing':
        return 'Installation...'
      case 'installed':
        return 'Installé'
      case 'launch':
        return 'Lancer'
      case 'info':
        return 'Info'
      default:
        return 'Disponible'
    }
  }

  return (
    <motion.div
      className="unified-tile"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        y: -8,
        transition: { duration: 0.2 },
      }}
      style={{
        position: 'relative',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        padding: '24px',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      {/* Effet de brillance au survol */}
      <motion.div
        className="tile-shine"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.6 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Header avec icône et titre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '18px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {resolvedIconSrc ? (
            <img
              src={resolvedIconSrc}
              alt={title}
              style={{ width: '36px', height: '36px', objectFit: 'contain' }}
            />
          ) : (
            <Icon size={36} color="white" />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#FFFFFF',
              margin: '0 0 4px 0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </h3>

          {(version || size) && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              {version && <span>v{version}</span>}
              {size && <span>• {size}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.7)',
          lineHeight: '1.5',
          margin: '0 0 20px 0',
          flex: 1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {description}
      </p>

      {/* Status et boutons d'action - TROIS BOUTONS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontWeight: '500',
          }}
        >
          {getStatusText()}
        </span>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Bouton Info */}
          <button
            className="unified-tile-action-button"
            onClick={(e) => {
              e.stopPropagation()
              onAction()
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              minWidth: 'fit-content',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            }}
            aria-label={`Info ${title}`}
            title={`Info ${title}`}
          >
            <Info size={16} />
            Info
          </button>

          {/* Bouton Lancer */}
          {onLaunch && (
            <button
              className="unified-tile-action-button"
              onClick={(e) => {
                e.stopPropagation()
                onLaunch()
              }}
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                minWidth: 'fit-content',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              aria-label={`Lancer ${title}`}
              title={`Lancer ${title}`}
            >
              <Play size={16} />
              Lancer
            </button>
          )}

          {/* Bouton Lancer en admin */}
          {onLaunchAdmin && (
            <button
              className="unified-tile-action-button"
              onClick={(e) => {
                e.stopPropagation()
                onLaunchAdmin()
              }}
              style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                minWidth: 'fit-content',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
              aria-label={`Lancer ${title} en administrateur`}
              title={`Lancer ${title} en administrateur`}
            >
              <ShieldAlert size={16} />
              Admin
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default UnifiedTile
