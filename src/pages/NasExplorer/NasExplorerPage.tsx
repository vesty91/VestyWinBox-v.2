import { motion } from 'framer-motion'
import {
  Archive,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Folder,
  HardDrive,
  LogIn,
  LogOut,
  Search,
  Server,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import SynologyAuthModal from '../../components/SynologyAuthModal'
import SynologyApiService, {
  FileInfo,
  ShareInfo,
  SynologySession,
  SystemInfo,
  VolumeInfo,
} from '../../services/SynologyApiService'
import { log } from '../../utils/logger'

interface NasServer {
  id: string
  name: string
  ip: string
  protocol: 'SMB' | 'FTP' | 'SFTP' | 'NFS' | 'HTTPS'
  status: 'connected' | 'disconnected' | 'connecting'
  totalSpace: number
  usedSpace: number
  lastSync: string
}

interface FileItem {
  name: string
  type: 'folder' | 'file'
  size?: number
  modified: string
  icon: any
  path?: string
}

const NasExplorerPage: React.FC = () => {
  // Synology API Integration
  const [apiService, setApiService] = useState<SynologyApiService | null>(null)
  const [session, setSession] = useState<SynologySession | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [_systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [_volumes, setVolumes] = useState<VolumeInfo[]>([])
  const [_shares, setShares] = useState<ShareInfo[]>([])

  const [servers, setServers] = useState<NasServer[]>([
    {
      id: '1',
      name: 'RestorPc (DS920+)',
      ip: 'nas.restor-pc.fr',
      protocol: 'HTTPS',
      status: 'disconnected',
      totalSpace: 8000,
      usedSpace: 4200,
      lastSync: '2024-01-15 14:30',
    },
    {
      id: '2',
      name: 'Backup NAS',
      ip: '192.168.1.101',
      protocol: 'SMB',
      status: 'disconnected',
      totalSpace: 4000,
      usedSpace: 2800,
      lastSync: '2024-01-14 09:15',
    },
    {
      id: '3',
      name: 'Media Server',
      ip: '192.168.1.102',
      protocol: 'SMB',
      status: 'disconnected',
      totalSpace: 2000,
      usedSpace: 650,
      lastSync: '2024-01-15 16:45',
    },
  ])

  const [selectedServer, setSelectedServer] = useState<string | null>('1')
  const [currentPath, setCurrentPath] = useState('/')
  const [files, setFiles] = useState<FileItem[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Check for existing session on component mount
  useEffect(() => {
    const loadData = async (service: SynologyApiService) => {
      try {
        const [systemData, volumesData, sharesData] = await Promise.all([
          service.getSystemInfo(),
          service.getVolumeInfo(),
          service.getSharedFolders(),
        ])

        setSystemInfo(systemData)
        setVolumes(volumesData)
        setShares(sharesData)

        if (volumesData.length > 0) {
          const totalSpace = volumesData.reduce((sum, vol) => sum + vol.total_space, 0)
          const usedSpace = volumesData.reduce((sum, vol) => sum + vol.used_space, 0)

          updateServerStatus('1', 'connected')
          setServers((prev) =>
            prev.map((s) =>
              s.id === '1'
                ? {
                    ...s,
                    totalSpace: Math.round(totalSpace / (1024 * 1024 * 1024)),
                    usedSpace: Math.round(usedSpace / (1024 * 1024 * 1024)),
                  }
                : s,
            ),
          )
        }
      } catch (error) {
        log.error('Error loading dashboard data', error, 'NasExplorer')
      }
    }

    const savedService = new SynologyApiService('nas.restor-pc.fr')
    if (savedService.isAuthenticated()) {
      setApiService(savedService)
      setSession(savedService.getSession())
      loadData(savedService)
      updateServerStatus('1', 'connected')
    }
  }, [])

  // Utility functions
  const formatSize = (sizeInBytes: number) => {
    if (sizeInBytes >= 1024 * 1024 * 1024 * 1024) {
      return `${(sizeInBytes / (1024 * 1024 * 1024 * 1024)).toFixed(1)} TB`
    } else if (sizeInBytes >= 1024 * 1024 * 1024) {
      return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
    } else if (sizeInBytes >= 1024 * 1024) {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
    } else if (sizeInBytes >= 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`
    }
    return `${sizeInBytes} B`
  }

  const getUsagePercentage = (used: number, total: number) => {
    return total > 0 ? Math.round((used / total) * 100) : 0
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('fr-FR')
  }

  const getFileIcon = (file: FileInfo) => {
    if (file.isdir) return Folder

    const ext = file.name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'mp4':
      case 'avi':
      case 'mkv':
      case 'mov':
        return Download // We'll use Download as Video isn't imported
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return Eye
      case 'zip':
      case 'rar':
      case 'tar':
      case '7z':
        return Archive
      case 'txt':
      case 'md':
      case 'log':
        return FileText
      default:
        return FileText
    }
  }

  // API Functions
  const updateServerStatus = (
    serverId: string,
    status: 'connected' | 'disconnected' | 'connecting',
  ) => {
    setServers((prev) => prev.map((s) => (s.id === serverId ? { ...s, status } : s)))
  }

  const loadDashboardData = async (service: SynologyApiService) => {
    try {
      const [systemData, volumesData, sharesData] = await Promise.all([
        service.getSystemInfo(),
        service.getVolumeInfo(),
        service.getSharedFolders(),
      ])

      setSystemInfo(systemData)
      setVolumes(volumesData)
      setShares(sharesData)

      // Update server info with real data
      if (volumesData.length > 0) {
        const totalSpace = volumesData.reduce((sum, vol) => sum + vol.total_space, 0)
        const usedSpace = volumesData.reduce((sum, vol) => sum + vol.used_space, 0)

        setServers((prev) =>
          prev.map((s) =>
            s.id === '1'
              ? {
                  ...s,
                  totalSpace: totalSpace / (1024 * 1024 * 1024), // Convert to GB
                  usedSpace: usedSpace / (1024 * 1024 * 1024),
                  lastSync: new Date().toLocaleString('fr-FR'),
                }
              : s,
          ),
        )
      }

      // Load root directory or shares
      if (currentPath === '/') {
        loadSharedFolders(service)
      } else {
        loadFiles(service, currentPath)
      }
    } catch (error) {
      log.error('Error loading dashboard data', error, 'NasExplorer')
    }
  }

  const loadSharedFolders = async (service: SynologyApiService) => {
    setIsLoadingFiles(true)
    try {
      log.info('Loading shared folders...', undefined, 'NasExplorer')
      const sharesData = await service.getSharedFolders()
      log.info('Shared folders data loaded', { count: sharesData?.length }, 'NasExplorer')

      if (sharesData && sharesData.length > 0) {
        const shareFiles: FileItem[] = sharesData.map((share) => ({
          name: share.name,
          type: 'folder' as const,
          modified: share.desc || 'Dossier partagé',
          icon: Folder,
          path: share.path || `/volume1/${share.name}`,
        }))
        setFiles(shareFiles)
        log.debug('Shared folders loaded:', shareFiles.length)
      } else {
        log.debug('No shared folders found, using fallback')
        // Fallback - essayons de lister directement les volumes
        await loadVolumeContents(service)
      }
    } catch (error) {
      log.error('Error loading shared folders:', error)
      // Fallback to volume listing
      await loadVolumeContents(service)
    } finally {
      setIsLoadingFiles(false)
    }
  }

  const loadVolumeContents = async (service: SynologyApiService) => {
    try {
      log.debug('Trying to load volume contents...')
      // Essayer de lister le contenu du volume principal
      const volumeFiles = await service.listFiles('/volume1')
      const fileItems: FileItem[] = volumeFiles.map((file) => ({
        name: file.name,
        type: file.isdir ? 'folder' : 'file',
        size: file.isdir ? undefined : file.size / (1024 * 1024), // Convert to MB
        modified: new Date(file.mtime * 1000).toLocaleString('fr-FR'),
        icon: file.isdir ? Folder : getFileIcon(file.name),
        path: file.path,
      }))
      setFiles(fileItems)
      log.debug('Volume contents loaded:', fileItems.length)
    } catch (error) {
      log.error('Error loading volume contents:', error)
      // Dernier fallback - dossiers communs Synology
      setFiles([
        {
          name: 'home',
          type: 'folder',
          modified: 'Dossiers utilisateurs',
          icon: Folder,
          path: '/volume1/homes',
        },
        {
          name: 'public',
          type: 'folder',
          modified: 'Dossier public',
          icon: Folder,
          path: '/volume1/public',
        },
        {
          name: 'photo',
          type: 'folder',
          modified: 'Photos Synology',
          icon: Folder,
          path: '/volume1/photo',
        },
        {
          name: 'video',
          type: 'folder',
          modified: 'Vidéos',
          icon: Folder,
          path: '/volume1/video',
        },
        {
          name: 'music',
          type: 'folder',
          modified: 'Musique',
          icon: Folder,
          path: '/volume1/music',
        },
      ])
    }
  }

  const loadFiles = async (service: SynologyApiService, path: string) => {
    setIsLoadingFiles(true)
    try {
      const filesData = await service.listFiles(path)
      const fileItems: FileItem[] = filesData.map((file) => ({
        name: file.name,
        type: file.isdir ? 'folder' : 'file',
        size: file.size ? file.size / (1024 * 1024) : undefined, // Convert to MB
        modified: formatDate(file.mt),
        icon: getFileIcon(file),
        path: file.path,
      }))
      setFiles(fileItems)
    } catch (error) {
      log.error('Error loading files:', error)
      setFiles([])
    } finally {
      setIsLoadingFiles(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    if (apiService) {
      await loadDashboardData(apiService)
    }
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const handleConnect = (serverId: string) => {
    if (serverId === '1') {
      setShowAuthModal(true)
    } else {
      // Simulate connection for other servers
      updateServerStatus(serverId, 'connecting')
      setTimeout(() => updateServerStatus(serverId, 'connected'), 2000)
    }
  }

  const handleAuthSuccess = (newSession: SynologySession, service: SynologyApiService) => {
    setSession(newSession)
    setApiService(service)
    updateServerStatus('1', 'connected')
    loadDashboardData(service)
  }

  const handleLogout = async () => {
    if (apiService) {
      await apiService.logout()
    }
    setSession(null)
    setApiService(null)
    setSystemInfo(null)
    setVolumes([])
    setShares([])
    setFiles([])
    updateServerStatus('1', 'disconnected')
  }

  // Check if file is an image
  const isImageFile = (fileName: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
    const extension = fileName.toLowerCase().slice(fileName.lastIndexOf('.'))
    return imageExtensions.includes(extension)
  }

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'folder' && file.path && apiService) {
      setCurrentPath(file.path)
      loadFiles(apiService, file.path)
    } else if (file.type === 'file' && file.path && apiService) {
      // Pour les fichiers, télécharger par défaut (sauf si on clique sur un bouton spécifique)
      handleDownloadFile(file)
    }
  }

  const handlePreviewImage = async (file: FileItem) => {
    if (!apiService || !file.path) {
      log.error('No API service or file path available')
      return
    }

    try {
      log.debug('Opening image preview for:', file.name)
      setPreviewFile(file)

      // Générer l'URL de prévisualisation
      const imageUrl = await apiService.getImagePreviewUrl(file.path)
      setPreviewUrl(imageUrl)
    } catch (error) {
      log.error('Preview error:', error)
      // En cas d'erreur, télécharger le fichier
      handleDownloadFile(file)
    }
  }

  const closePreview = () => {
    setPreviewFile(null)
    setPreviewUrl(null)
  }

  // Gérer la touche Échap pour fermer la prévisualisation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && previewFile) {
        closePreview()
      }
    }

    if (previewFile) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [previewFile])

  const handleDownloadFile = async (file: FileItem) => {
    if (!apiService || !file.path) {
      log.error('No API service or file path available')
      return
    }

    try {
      log.debug('Starting download for:', file.name)

      const result = await apiService.downloadFile(file.path)

      if (result === 'Downloaded via Electron') {
        log.debug('File downloaded successfully via Electron')
        // Le fichier a été téléchargé via Electron, pas besoin d'ouvrir le navigateur
      } else {
        // Fallback: c'est une URL, l'ouvrir dans le navigateur par défaut
        log.debug('Opening download URL in browser:', result)
        if ((window as any).electronAPI?.shell?.openExternal) {
          // Utiliser l'API Electron pour ouvrir dans le navigateur par défaut
          ;(window as any).electronAPI.shell.openExternal(result)
        } else {
          // Fallback normal
          window.open(result, '_blank')
        }
      }
    } catch (error) {
      log.error('Download error:', error)
      alert(`Erreur de téléchargement: ${error.message}`)
    }
  }

  const handleBackNavigation = () => {
    if (currentPath !== '/') {
      const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/'
      setCurrentPath(parentPath)
      if (apiService) {
        if (parentPath === '/') {
          loadSharedFolders(apiService)
        } else {
          loadFiles(apiService, parentPath)
        }
      }
    }
  }

  const openNasWebInterface = async (server: NasServer) => {
    const url =
      server.protocol === 'HTTPS' ? `https://${server.ip}/#/signin` : `http://${server.ip}`

    try {
      // Essayer d'utiliser l'API Electron pour ouvrir dans une nouvelle fenêtre
      if ((window as any).electronAPI?.openWebWindow) {
        await (window as any).electronAPI.openWebWindow(url)
      } else {
        // Fallback vers le navigateur externe si l'API n'est pas disponible
        window.open(url, '_blank')
      }
    } catch (error) {
      log.error("Erreur lors de l'ouverture de l'interface web:", error)
      // Fallback vers le navigateur externe en cas d'erreur
      window.open(url, '_blank')
    }
  }

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div style={{ minHeight: '100vh', padding: '20px' }}>
      {/* En-tête */}
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
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                  backgroundImage: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
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

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '12px',
                color: 'white',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
                opacity: isRefreshing ? 0.7 : 1,
              }}
            >
              <span className={isRefreshing ? 'animate-spin' : ''} aria-hidden>
                ↻
              </span>
              Actualiser
            </button>

            {session ? (
              <button
                onClick={handleLogout}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  color: '#EF4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                }}
              >
                <LogOut size={18} />
                Déconnecter
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '600',
                  transition: 'transform 0.2s ease',
                }}
              >
                <LogIn size={18} />
                Se connecter
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px' }}>
        {/* Panneau latéral - Liste des serveurs */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '24px',
            height: 'fit-content',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <h3
              style={{
                fontSize: '18px',
                fontWeight: '700',
                margin: 0,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Server size={20} />
              Serveurs NAS
            </h3>

            {session && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Users size={12} />
                {session.username}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {servers.map((server) => (
              <motion.div
                key={server.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedServer(server.id)}
                style={{
                  background:
                    selectedServer === server.id
                      ? 'rgba(6, 182, 212, 0.2)'
                      : 'rgba(255, 255, 255, 0.05)',
                  border:
                    selectedServer === server.id
                      ? '1px solid rgba(6, 182, 212, 0.5)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'white', margin: 0 }}>
                    {server.name}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {server.status === 'connected' ? (
                      <Wifi size={16} color="#10B981" />
                    ) : server.status === 'connecting' ? (
                      <span className="animate-spin" aria-hidden>
                        ↻
                      </span>
                    ) : (
                      <WifiOff size={16} color="#EF4444" />
                    )}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '8px',
                  }}
                >
                  {server.ip} • {server.protocol}
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      marginBottom: '4px',
                    }}
                  >
                    <span>{formatSize(server.usedSpace)} utilisé</span>
                    <span>{formatSize(server.totalSpace)} total</span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '4px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${getUsagePercentage(server.usedSpace, server.totalSpace)}%`,
                        height: '100%',
                        background:
                          getUsagePercentage(server.usedSpace, server.totalSpace) > 80
                            ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                            : 'linear-gradient(90deg, #06B6D4, #0891B2)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {server.status === 'disconnected' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleConnect(server.id)
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        color: 'white',
                        fontSize: '12px',
                        cursor: 'pointer',
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      <LogIn size={12} />
                      {server.id === '1' ? 'Authentifier' : 'Se connecter'}
                    </button>
                  )}

                  {server.protocol === 'HTTPS' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openNasWebInterface(server)
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        color: 'white',
                        fontSize: '12px',
                        cursor: 'pointer',
                        flex: server.status === 'disconnected' ? 1 : '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      <ExternalLink size={12} />
                      {server.status === 'disconnected' ? 'Interface web' : 'Ouvrir interface web'}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Zone principale - Explorateur de fichiers */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '24px',
            minHeight: '600px',
          }}
        >
          {/* Barre d'outils */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {currentPath !== '/' && (
                <button
                  onClick={handleBackNavigation}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  ← Retour
                </button>
              )}

              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontFamily: 'monospace',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <HardDrive size={16} />
                {selectedServer
                  ? servers.find((s) => s.id === selectedServer)?.name
                  : 'Aucun serveur'}
                {currentPath}
              </div>

              {isLoadingFiles && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'rgba(255, 255, 255, 0.6)',
                  }}
                >
                  <span className="animate-spin" aria-hidden>
                    ↻
                  </span>
                  Chargement...
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Search
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
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '8px 8px 8px 40px',
                    color: 'white',
                    fontSize: '14px',
                    width: '200px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Liste des fichiers */}
          {selectedServer ? (
            filteredFiles.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredFiles.map((file, index) => (
                  <motion.div
                    key={`${file.name}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '8px',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <file.icon size={20} color={file.type === 'folder' ? '#F59E0B' : '#94A3B8'} />
                    <div
                      style={{ flex: 1, cursor: file.type === 'folder' ? 'pointer' : 'default' }}
                      onClick={() => file.type === 'folder' && handleFileClick(file)}
                    >
                      <div style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        {file.modified}
                        {file.size && ` • ${formatSize(file.size * 1024 * 1024)}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {file.type === 'folder' ? (
                        <div
                          style={{
                            color: 'rgba(255, 255, 255, 0.4)',
                            fontSize: '12px',
                            padding: '4px 8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '4px',
                          }}
                        >
                          Dossier
                        </div>
                      ) : isImageFile(file.name) ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePreviewImage(file)
                            }}
                            style={{
                              color: 'rgba(16, 185, 129, 0.9)',
                              fontSize: '12px',
                              padding: '6px 10px',
                              background: 'rgba(16, 185, 129, 0.1)',
                              borderRadius: '6px',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'
                            }}
                          >
                            <Eye size={12} />
                            Aperçu
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownloadFile(file)
                            }}
                            style={{
                              color: 'rgba(6, 182, 212, 0.9)',
                              fontSize: '12px',
                              padding: '6px 10px',
                              background: 'rgba(6, 182, 212, 0.1)',
                              borderRadius: '6px',
                              border: '1px solid rgba(6, 182, 212, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)'
                            }}
                          >
                            <Download size={12} />
                            Télécharger
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadFile(file)
                          }}
                          style={{
                            color: 'rgba(6, 182, 212, 0.9)',
                            fontSize: '12px',
                            padding: '6px 10px',
                            background: 'rgba(6, 182, 212, 0.1)',
                            borderRadius: '6px',
                            border: '1px solid rgba(6, 182, 212, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)'
                          }}
                        >
                          <Download size={12} />
                          Télécharger
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '300px',
                  color: 'rgba(255, 255, 255, 0.5)',
                }}
              >
                {isLoadingFiles ? (
                  <>
                    <span
                      className="animate-spin"
                      style={{ fontSize: 48, marginBottom: '16px' }}
                      aria-hidden
                    >
                      ↻
                    </span>
                    <p style={{ fontSize: '16px', margin: 0 }}>Chargement des fichiers...</p>
                  </>
                ) : session ? (
                  <>
                    <Folder size={48} style={{ marginBottom: '16px' }} />
                    <p style={{ fontSize: '16px', margin: 0 }}>
                      Aucun fichier trouvé dans ce dossier
                    </p>
                  </>
                ) : (
                  <>
                    <LogIn size={48} style={{ marginBottom: '16px' }} />
                    <p style={{ fontSize: '16px', margin: 0 }}>
                      Connectez-vous pour explorer les fichiers
                    </p>
                  </>
                )}
              </div>
            )
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '400px',
                color: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              <HardDrive size={64} style={{ marginBottom: '16px' }} />
              <p style={{ fontSize: '16px', margin: 0 }}>
                Sélectionnez un serveur NAS pour explorer ses fichiers
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal d'authentification */}
      <SynologyAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        defaultHost="nas.restor-pc.fr"
      />

      {/* Modal de prévisualisation d'image */}
      {previewFile && previewUrl && (
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
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(10px)',
          }}
          onClick={closePreview}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            style={{
              width: '95vw',
              height: '95vh',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(20px)',
              padding: '20px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête du modal */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                paddingBottom: '15px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div>
                <h3
                  style={{
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: '600',
                    margin: 0,
                  }}
                >
                  {previewFile.name}
                </h3>
                <p
                  style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '14px',
                    margin: '5px 0 0 0',
                  }}
                >
                  {previewFile.size ? `${previewFile.size.toFixed(2)} MB` : 'Taille inconnue'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleDownloadFile(previewFile)}
                  style={{
                    background: 'rgba(6, 182, 212, 0.2)',
                    border: '1px solid rgba(6, 182, 212, 0.5)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: '#06B6D4',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  <Download size={16} />
                  Télécharger
                </button>
                <button
                  onClick={closePreview}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    borderRadius: '8px',
                    padding: '8px',
                    color: '#EF4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Image */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
                overflow: 'hidden',
                minHeight: 0,
              }}
            >
              <img
                src={previewUrl}
                alt={previewFile.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  borderRadius: '12px',
                  objectFit: 'contain',
                }}
                onError={(e) => {
                  log.error('Image loading error:', e)
                  closePreview()
                  handleDownloadFile(previewFile)
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

export default NasExplorerPage
