import React from 'react'

export type ButtonVariant = 'primary' | 'warn' | 'ghost' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps {
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  fullWidth?: boolean
  title?: string
  ariaLabel?: string
  style?: React.CSSProperties
  leftIcon?: React.ReactNode
}

const sizeToPadding: Record<ButtonSize, string> = {
  sm: '8px 12px',
  md: '12px 16px',
  lg: '14px 20px',
}

function resolveVariantStyles(variant: ButtonVariant, disabled?: boolean): React.CSSProperties {
  if (disabled) {
    return {
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.15)',
      color: 'rgba(255,255,255,0.7)',
    }
  }
  switch (variant) {
    case 'primary':
      return {
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        border: 'none',
        color: '#fff',
      }
    case 'warn':
      return {
        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        border: 'none',
        color: '#fff',
      }
    case 'ghost':
      return {
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff',
      }
    case 'outline':
    default:
      return {
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid var(--border)',
        color: '#fff',
      }
  }
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'outline',
  size = 'md',
  disabled = false,
  fullWidth = false,
  title,
  ariaLabel,
  style,
  leftIcon,
}) => {
  const computedStyle: React.CSSProperties = {
    padding: sizeToPadding[size],
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: fullWidth ? '100%' : undefined,
    opacity: disabled ? 0.7 : 1,
    ...resolveVariantStyles(variant, disabled),
    ...style,
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      aria-label={ariaLabel}
      disabled={disabled}
      style={computedStyle}
    >
      {leftIcon}
      {children}
    </button>
  )
}

export default Button
