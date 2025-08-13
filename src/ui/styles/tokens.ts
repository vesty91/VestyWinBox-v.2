export const colors = {
  textPrimary: 'var(--text-primary)',
  textMuted: 'var(--text-muted)',
  icon: 'var(--icon)',
  tileBg: 'var(--tile-bg)',
  border: 'var(--border)',
}

export const radii = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
}

export const card = {
  base: {
    background: colors.tileBg,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.lg,
    padding: 16,
  } as React.CSSProperties,
}

export const input = {
  base: {
    padding: '10px 12px',
    borderRadius: radii.md,
    border: `1px solid ${colors.border}`,
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
  } as React.CSSProperties,
}

export const select = {
  base: {
    padding: '6px 8px',
    borderRadius: radii.md,
    border: `1px solid ${colors.border}`,
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
  } as React.CSSProperties,
}

export const surface = {
  muted: {
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${colors.border}`,
    borderRadius: radii.lg,
  } as React.CSSProperties,
}
