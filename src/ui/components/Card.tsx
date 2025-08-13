import React from 'react'

export interface CardProps {
  children: React.ReactNode
  style?: React.CSSProperties
}

const Card: React.FC<CardProps> = ({ children, style }) => {
  return (
    <div
      style={{
        background: 'var(--tile-bg)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export default Card
