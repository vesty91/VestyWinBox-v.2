export const modalBackdrop: React.CSSProperties = {
  position: 'fixed',
  inset: 0 as any,
  background: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,
  padding: 20,
}

export const modalCard: React.CSSProperties = {
  background: 'rgba(30, 30, 30, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 16,
  padding: 32,
  maxWidth: 600,
  width: '100%',
  maxHeight: '80vh',
  overflow: 'auto',
  backdropFilter: 'blur(20px)',
}

export const closeBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'rgba(255,255,255,0.6)',
  cursor: 'pointer',
  padding: 8,
  borderRadius: 8,
}

export const btnPrimary: React.CSSProperties = {
  padding: '12px 24px',
  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  border: 'none',
  borderRadius: 10,
  color: '#fff',
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
}

export const btnWarn: React.CSSProperties = {
  padding: '12px 24px',
  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  border: 'none',
  borderRadius: 10,
  color: '#fff',
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
}

export const btnGhost: React.CSSProperties = {
  padding: '12px 24px',
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 10,
  color: '#fff',
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
}
