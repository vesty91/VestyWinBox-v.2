import React from 'react'

export type TagVariant = 'neutral' | 'success' | 'danger' | 'info' | 'warning'

export interface TagProps {
  children: React.ReactNode
  variant?: TagVariant
  style?: React.CSSProperties
}

function variantStyles(variant: TagVariant): React.CSSProperties {
  switch (variant) {
    case 'success':
      return {
        background: 'rgba(16,185,129,0.12)',
        border: '1px solid rgba(16,185,129,0.35)',
        color: '#10B981',
      }
    case 'danger':
      return {
        background: 'rgba(239,68,68,0.12)',
        border: '1px solid rgba(239,68,68,0.35)',
        color: '#EF4444',
      }
    case 'info':
      return {
        background: 'rgba(59,130,246,0.12)',
        border: '1px solid rgba(59,130,246,0.35)',
        color: '#3B82F6',
      }
    case 'warning':
      return {
        background: 'rgba(245,158,11,0.12)',
        border: '1px solid rgba(245,158,11,0.35)',
        color: '#F59E0B',
      }
    case 'neutral':
    default:
      return {
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: 'rgba(255,255,255,0.85)',
      }
  }
}

const Tag: React.FC<TagProps> = ({ children, variant = 'neutral', style }) => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '4px 10px',
        fontSize: 12,
        fontWeight: 600,
        ...variantStyles(variant),
        ...style,
      }}
    >
      {children}
    </span>
  )
}

export default Tag
