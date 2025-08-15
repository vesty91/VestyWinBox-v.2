import { AnimatePresence, motion } from 'framer-motion'
import { Eye, EyeOff, Loader, Lock, Server, User, X } from 'lucide-react'
import React, { useState } from 'react'
import SynologyApiService, {
  SynologyCredentials,
  SynologySession,
} from '../services/SynologyApiService'

interface SynologyAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (session: SynologySession, apiService: SynologyApiService) => void
  defaultHost?: string
}

const SynologyAuthModal: React.FC<SynologyAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultHost = 'nas.restor-pc.fr',
}) => {
  const [credentials, setCredentials] = useState<SynologyCredentials>({
    host: defaultHost,
    username: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const apiService = new SynologyApiService(credentials.host)
      await apiService.getApiInfo()
      const session = await apiService.authenticate(credentials)

      onSuccess(session, apiService)
      onClose()

      // Reset form
      setCredentials({
        host: defaultHost,
        username: '',
        password: '',
      })
    } catch (error: any) {
      setError(error.message || 'Erreur de connexion')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof SynologyCredentials, value: string) => {
    // Nettoyer l'adresse du serveur si c'est le champ host
    if (field === 'host') {
      // Supprimer le protocole et les paths
      value = value
        .replace(/^https?:\/\//, '') // Supprimer http:// ou https://
        .replace(/\/.*$/, '') // Supprimer tout après le premier /
        .trim()
    }

    setCredentials((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background:
                'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '24px',
              padding: '32px',
              width: '400px',
              maxWidth: '90vw',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Lock size={20} color="white" />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      margin: 0,
                      color: 'white',
                    }}
                  >
                    Connexion Synology
                  </h2>
                  <p
                    style={{
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      margin: 0,
                    }}
                  >
                    Authentifiez-vous sur votre NAS
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none'
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              {/* Host */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'rgba(255, 255, 255, 0.8)',
                    marginBottom: '8px',
                  }}
                >
                  Serveur NAS
                </label>
                <div style={{ position: 'relative' }}>
                  <Server
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}
                  />
                  <input
                    type="text"
                    value={credentials.host}
                    onChange={(e) => handleInputChange('host', e.target.value)}
                    placeholder="nas.restor-pc.fr"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 44px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(6, 182, 212, 0.5)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                    }}
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'rgba(255, 255, 255, 0.8)',
                    marginBottom: '8px',
                  }}
                >
                  Nom d'utilisateur
                </label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}
                  />
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="admin"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 44px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(6, 182, 212, 0.5)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'rgba(255, 255, 255, 0.8)',
                    marginBottom: '8px',
                  }}
                >
                  Mot de passe
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 44px 12px 44px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(6, 182, 212, 0.5)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.5)',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#EF4444',
                    fontSize: '14px',
                  }}
                >
                  {error}
                </motion.div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    flex: 2,
                    padding: '12px',
                    background: isLoading
                      ? 'rgba(6, 182, 212, 0.5)'
                      : 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </button>
              </div>
            </form>

            {/* Info */}
            <div
              style={{
                marginTop: '20px',
                padding: '12px',
                background: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: '1.4',
              }}
            >
              💡 Utilisez vos identifiants DSM Synology habituels. Les données sont stockées
              localement et chiffrées.
            </div>

            {/* CORS Warning */}
            {error?.includes('Failed to fetch') && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#EF4444',
                  lineHeight: '1.4',
                }}
              >
                ⚠️ <strong>Problème CORS détecté</strong>
                <br />
                Pour résoudre ce problème :<br />
                1. Activez CORS dans DSM → Panneau de configuration → Sécurité → Avancé
                <br />
                2. Ajoutez votre domaine dans les "Origines autorisées"
                <br />
                3. Ou utilisez l'interface web directement via le bouton "Ouvrir interface web"
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default SynologyAuthModal
