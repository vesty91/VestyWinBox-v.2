import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Component, ErrorInfo, ReactNode } from 'react'
import { surface } from '../ui/styles/tokens'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erreur capturée par ErrorBoundary:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 15, 15, 0.95)',
            color: '#FFFFFF',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <div
            style={{
              ...surface.muted,
              padding: '48px',
              maxWidth: '500px',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto',
              }}
            >
              <AlertTriangle size={40} color="white" />
            </div>

            <h1
              style={{
                fontSize: '24px',
                fontWeight: '700',
                margin: '0 0 16px 0',
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Oups ! Une erreur s'est produite
            </h1>

            <p
              style={{
                fontSize: '16px',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: '1.6',
                margin: '0 0 32px 0',
              }}
            >
              VestyWinBox a rencontré un problème inattendu. Nous nous excusons pour ce désagrément.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  padding: '16px',
                  margin: '0 0 24px 0',
                  textAlign: 'left',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontWeight: '600',
                    marginBottom: '8px',
                  }}
                >
                  Détails de l'erreur (Développement)
                </summary>
                <pre
                  style={{
                    fontSize: '12px',
                    color: '#FCA5A5',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={this.handleReload}
                style={{
                  background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <RefreshCw size={16} />
                Recharger
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <Home size={16} />
                Accueil
              </button>
            </div>

            <p
              style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.5)',
                margin: '24px 0 0 0',
              }}
            >
              Si le problème persiste, contactez le support technique.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
