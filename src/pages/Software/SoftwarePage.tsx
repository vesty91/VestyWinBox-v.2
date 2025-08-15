import { AnimatePresence, motion } from 'framer-motion'
import { Download, Package, RefreshCw, Search, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import UnifiedTile from '../../components/UnifiedTile/UnifiedTile'
import { t } from '../../i18n'
import toolsService, { Category, Tool } from '../../services/ToolsService'
import Button from '../../ui/components/Button'
import { closeBtn, modalBackdrop, modalCard } from '../../ui/modalStyles'
import { input as inputTokens, select as selectTokens, surface } from '../../ui/styles/tokens'
// Grille classique (identique visuel à Apps Portables)

const SoftwarePage: React.FC = () => {
  const [software, setSoftware] = useState<Tool[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [installingSoftware, setInstallingSoftware] = useState<string[]>([])
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  const loadData = async () => {
    try {
      setLoading(true)
      const [softwareData, categoriesData] = await Promise.all([
        toolsService.scanLogiciels(),
        Promise.resolve(toolsService.getSoftwareCategories()),
      ])
      setSoftware(softwareData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInstall = async (toolId: string) => {
    try {
      setInstallingSoftware((prev) => [...prev, toolId])
      const tool = software.find((s) => s.id === toolId)
      if (!tool) throw new Error('Logiciel non trouvé')

      if (tool.executablePath && window.electronAPI) {
        const success = await window.electronAPI.launchApplication(tool.executablePath)
        if (!success) console.error(`Échec du lancement de ${tool.title}`)
      } else {
        const success = await toolsService.installSoftware(toolId)
        if (success) {
          setSoftware((prev) =>
            prev.map((t) => (t.id === toolId ? { ...t, status: 'installed' as const } : t)),
          )
        }
      }
    } catch (error) {
      console.error('Erreur lors du lancement:', error)
    } finally {
      setInstallingSoftware((prev) => prev.filter((id) => id !== toolId))
    }
  }

  const openInfo = (tool: Tool) => {
    setSelectedTool(tool)
    setInfoModalOpen(true)
  }
  const closeInfo = () => {
    setInfoModalOpen(false)
    setSelectedTool(null)
  }

  const filteredSoftware = software.filter((tool) => {
    const needle = debouncedSearch.toLowerCase()
    const matchesSearch =
      !needle ||
      tool.title.toLowerCase().includes(needle) ||
      tool.description.toLowerCase().includes(needle) ||
      tool.tags.some((tag) => tag.toLowerCase().includes(needle))
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getActionButton = (tool: Tool) => {
    if (installingSoftware.includes(tool.id)) {
      return {
        text: 'Lancement...',
        icon: RefreshCw,
        action: () => {},
        status: 'installing' as const,
      }
    }
    switch (tool.status) {
      case 'available':
      case 'installed':
      default:
        return {
          text: 'Lancer',
          icon: Download,
          action: () => handleInstall(tool.id),
          status: tool.status || ('available' as const),
        }
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw size={48} color="#FFD700" />
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* En-tête */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ marginBottom: '32px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Package size={28} color="white" />
          </div>
          <div>
            <h1
              style={{
                fontSize: 36,
                fontWeight: 800,
                margin: '0 0 8px 0',
                backgroundImage: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Gestion des Logiciels
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text-muted)', margin: 0 }}>
              Installez, mettez à jour et gérez vos applications système
            </p>
          </div>
        </div>

        {/* Statistiques */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}
        >
          {[
            { label: 'Total Logiciels', value: software.length, color: '#3B82F6' },
            {
              label: 'Installés',
              value: software.filter((s) => s.status === 'installed').length,
              color: '#10B981',
            },
            {
              label: 'Disponibles',
              value: software.filter((s) => s.status === 'available').length,
              color: '#F59E0B',
            },
            { label: 'Catégories', value: categories.length, color: '#8B5CF6' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              style={{ ...surface.muted, padding: 20, textAlign: 'center' }}
            >
              <div style={{ fontSize: 32, fontWeight: 800, color: stat.color, marginBottom: 8 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Filtres et recherche */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 32,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Barre de recherche */}
        <div style={{ position: 'relative', flex: 1, minWidth: 300 }}>
          <Search
            size={20}
            color="var(--text-muted)"
            style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
          <input
            aria-label={t('search_placeholder')}
            type="text"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ ...inputTokens.base, width: '100%', padding: '12px 16px 12px 48px' }}
          />
        </div>

        {/* Filtre par catégorie */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          aria-label="Filtrer par catégorie"
          style={{ ...selectTokens.base, minWidth: 200 }}
        >
          <option value="all">{t('all_categories') || 'Toutes les catégories'}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name} ({category.count})
            </option>
          ))}
        </select>

        {/* Bouton de rafraîchissement */}
        <button
          onClick={loadData}
          style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            border: 'none',
            borderRadius: '12px',
            color: '#FFFFFF',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <RefreshCw size={20} />
          {t('refresh') || 'Actualiser'}
        </button>
      </motion.div>

      {/* Grille des logiciels (identique visuel à Apps Portables) */}
      <AnimatePresence mode="sync">
        {filteredSoftware.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              ...surface.muted,
              textAlign: 'center',
              padding: '64px 24px',
              color: 'var(--text-muted)',
            }}
          >
            <Package size={64} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>
              {t('no_software_found') || 'Aucun logiciel trouvé'}
            </h3>
            <p style={{ margin: 0, fontSize: '16px' }}>
              {t('try_adjust_filters') || 'Essayez de modifier vos critères de recherche'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '24px',
            }}
          >
            {filteredSoftware.map((tool, index) => {
              const actionButton = getActionButton(tool)
              return (
                <UnifiedTile
                  key={tool.id}
                  title={tool.title}
                  version={tool.version}
                  size={tool.size}
                  description={tool.description}
                  icon={Package}
                  status={actionButton.status}
                  onAction={() => openInfo(tool)}
                  onLaunch={() => handleInstall(tool.id)}
                  index={index}
                  iconPath={tool.iconPath}
                />
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modale d'information */}
      <AnimatePresence>
        {infoModalOpen && selectedTool && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={modalBackdrop}
            onClick={closeInfo}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={modalCard}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header aligné avec icône */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 24,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Package size={24} color="#fff" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>
                      {selectedTool.title}
                    </h2>
                    <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.7)' }}>
                      {selectedTool.description}
                    </p>
                  </div>
                </div>
                <button onClick={closeInfo} title="Fermer" style={closeBtn}>
                  <X size={24} />
                </button>
              </div>

              {/* Détails */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div>
                  <div
                    style={{ fontSize: 12, color: '#34D399', fontWeight: 700, letterSpacing: 0.4 }}
                  >
                    VERSION
                  </div>
                  <div style={{ color: '#fff' }}>{selectedTool.version || '—'}</div>
                </div>
                <div>
                  <div
                    style={{ fontSize: 12, color: '#34D399', fontWeight: 700, letterSpacing: 0.4 }}
                  >
                    TAILLE
                  </div>
                  <div style={{ color: '#fff' }}>{selectedTool.size || '—'}</div>
                </div>
                <div>
                  <div
                    style={{ fontSize: 12, color: '#34D399', fontWeight: 700, letterSpacing: 0.4 }}
                  >
                    CATÉGORIE
                  </div>
                  <div style={{ color: '#fff' }}>{selectedTool.category}</div>
                </div>
                <div>
                  <div
                    style={{ fontSize: 12, color: '#34D399', fontWeight: 700, letterSpacing: 0.4 }}
                  >
                    STATUT
                  </div>
                  <div style={{ color: '#fff' }}>{selectedTool.status}</div>
                </div>
              </div>

              {/* Tags comme fonctionnalités */}
              {selectedTool.tags?.length ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#34D399', marginBottom: 8 }}>
                    FONCTIONNALITÉS PRINCIPALES
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#fff' }}>
                    {selectedTool.tags.map((t, i) => (
                      <li key={i} style={{ marginBottom: 6 }}>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Boutons d’action */}
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  marginTop: 16,
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  variant="primary"
                  onClick={() => {
                    closeInfo()
                    handleInstall(selectedTool.id)
                  }}
                >
                  Lancer l'application
                </Button>
                {selectedTool.executablePath && (
                  <Button
                    variant="warn"
                    onClick={async () => {
                      if (window.electronAPI && selectedTool.executablePath) {
                        await window.electronAPI.launchApplicationElevated(
                          selectedTool.executablePath,
                        )
                        closeInfo()
                      }
                    }}
                  >
                    Lancer en admin
                  </Button>
                )}
                <Button variant="ghost" onClick={closeInfo}>
                  Fermer
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SoftwarePage
