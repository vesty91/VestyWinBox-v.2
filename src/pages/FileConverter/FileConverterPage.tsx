import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle,
  File,
  FileDown,
  FileText,
  FileUp,
  Image,
  Music,
  Settings,
  Upload,
  Video,
  X,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UnifiedTile from '../../components/UnifiedTile/UnifiedTile'
import Button from '../../ui/components/Button'
import { pushToast } from '../../ui/components/Toaster'
import { closeBtn, modalBackdrop, modalCard } from '../../ui/modalStyles'

interface ConversionModal {
  isOpen: boolean
  type: string
  title: string
  description: string
  supportedFormats: string[]
  outputFormats: string[]
}

type SelectedFile = { name: string; size: number; path?: string }
type QueueStatus = 'pending' | 'processing' | 'done' | 'error'
type QueueItem = { name: string; status: QueueStatus; output?: string | null; error?: string }

const FileConverterPage: React.FC = () => {
  const navigate = useNavigate()
  const [conversionModal, setConversionModal] = useState<ConversionModal | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [outputFormat, setOutputFormat] = useState('')
  const [converting, setConverting] = useState(false)
  const [conversionProgress, setConversionProgress] = useState(0)
  const [conversionResults, setConversionResults] = useState<
    Array<{
      original: string
      converted: string
      success: boolean
      error?: string
    }>
  >([])
  const doneCount = useMemo(
    () => conversionResults.filter((r) => r.success).length,
    [conversionResults],
  )
  const [outputDir, setOutputDir] = useState<string>('')
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [videoCrf, setVideoCrf] = useState<number>(23)
  const [videoPreset, setVideoPreset] = useState<
    | 'ultrafast'
    | 'superfast'
    | 'veryfast'
    | 'faster'
    | 'fast'
    | 'medium'
    | 'slow'
    | 'slower'
    | 'veryslow'
  >('medium')
  const [audioBitrateK, setAudioBitrateK] = useState<number>(192)
  const [qualityPreset, setQualityPreset] = useState<'eco' | 'standard' | 'high'>('standard')
  const [tools, setTools] = useState<{
    ffmpeg: boolean
    magick: boolean
    sevenZip: boolean
    libreoffice: boolean
    gs: boolean
  }>({ ffmpeg: false, magick: false, sevenZip: false, libreoffice: false, gs: false })
  const missingCount = useMemo(() => Object.values(tools).filter((v) => !v).length, [tools])
  const missingPkgs = useMemo(() => {
    const list: string[] = []
    if (!tools.ffmpeg) list.push('ffmpeg')
    if (!tools.magick) list.push('imagemagick')
    if (!tools.sevenZip) list.push('7zip')
    if (!tools.libreoffice) list.push('libreoffice-fresh')
    if (!tools.gs) list.push('ghostscript')
    return list
  }, [tools])
  const [installingAll, setInstallingAll] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const t = await window.electronAPI.detectConverters()
        if (t) setTools(t)
      } catch {}
    })()
  }, [])

  useEffect(() => {
    // écouter la progression des conversions
    const sid = 'conv-' + Math.random().toString(36).slice(2)
    ;(window as any).__vw_conv_sid = sid
    const onP = (msg: any) => {
      if (msg?.sessionId !== (window as any).__vw_conv_sid) return
      if (msg?.file) {
        setQueueItems((prev) => {
          const idx = prev.findIndex((q) => q.name === msg.file)
          if (idx >= 0 && prev[idx].status === 'pending') {
            const next = [...prev]
            next[idx] = { ...next[idx], status: 'processing' }
            return next
          }
          return prev
        })
      }
      setConversionProgress((p) => Math.min(99, p + 0.5))
    }
    const onD = (msg: any) => {
      if (msg?.sessionId !== (window as any).__vw_conv_sid) return
      setConversionResults((prev) => [
        ...prev,
        {
          original: msg.file,
          converted: msg.output || '',
          success: !!msg.success,
          error: msg.error,
        },
      ])
      setQueueItems((prev) => {
        const idx = prev.findIndex((q) => q.name === msg.file)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = {
            name: msg.file,
            status: msg.success ? 'done' : 'error',
            output: msg.output || null,
            error: msg.error,
          }
          return next
        }
        return prev
      })
      setConversionProgress((prev) => {
        const total = selectedFiles.length || 1
        const done = Math.min(selectedFiles.length, conversionResults.length + 1)
        return Math.max(prev, Math.round((done / total) * 100))
      })
    }
    const onS = (msg: any) => {
      if (msg?.sessionId !== (window as any).__vw_conv_sid) return
      setConverting(false)
      setConversionProgress(100)
    }
    window.electronAPI.onConvertProgress(onP)
    window.electronAPI.onConvertFileDone(onD)
    window.electronAPI.onConvertSessionDone(onS)
    return () => {
      try {
        window.electronAPI.offConvertProgress(onP)
      } catch {}
      try {
        window.electronAPI.offConvertFileDone(onD)
      } catch {}
      try {
        window.electronAPI.offConvertSessionDone(onS)
      } catch {}
    }
  }, [selectedFiles.length, conversionResults.length])

  const converterTools = [
    {
      id: 'image-converter',
      title: "Convertisseur d'images",
      description: 'Convertissez vos images entre JPG, PNG, WebP, GIF et autres formats.',
      icon: Image,
      status: 'available' as const,
      action: () =>
        openConversionModal(
          'image',
          "Convertisseur d'images",
          'Convertissez vos images entre différents formats',
          ['JPG', 'PNG', 'BMP', 'GIF', 'TIFF', 'WebP', 'SVG'],
          ['JPG', 'PNG', 'WebP', 'GIF', 'BMP', 'TIFF'],
        ),
      actionText: 'Convertir',
      actionIcon: Upload,
    },
    {
      id: 'video-converter',
      title: 'Convertisseur vidéo',
      description: 'Convertissez vos vidéos entre MP4, AVI, MOV, MKV et autres formats.',
      icon: Video,
      status: 'available' as const,
      action: () =>
        openConversionModal(
          'video',
          'Convertisseur vidéo',
          'Convertissez vos vidéos entre différents formats',
          ['MP4', 'AVI', 'MOV', 'MKV', 'WMV', 'FLV', 'WebM'],
          ['MP4', 'AVI', 'MOV', 'MKV', 'WebM'],
        ),
      actionText: 'Convertir',
      actionIcon: Upload,
    },
    {
      id: 'audio-converter',
      title: 'Convertisseur audio',
      description: 'Convertissez vos fichiers audio entre MP3, WAV, FLAC, AAC et autres formats.',
      icon: Music,
      status: 'available' as const,
      action: () =>
        openConversionModal(
          'audio',
          'Convertisseur audio',
          'Convertissez vos fichiers audio entre différents formats',
          ['MP3', 'WAV', 'FLAC', 'AAC', 'OGG', 'WMA', 'M4A'],
          ['MP3', 'WAV', 'FLAC', 'AAC', 'OGG'],
        ),
      actionText: 'Convertir',
      actionIcon: Upload,
    },
    {
      id: 'document-converter',
      title: 'Convertisseur de documents',
      description: 'Convertissez vos documents entre PDF, DOC, DOCX, TXT et autres formats.',
      icon: FileText,
      status: 'available' as const,
      action: () =>
        openConversionModal(
          'document',
          'Convertisseur de documents',
          'Convertissez vos documents entre différents formats',
          ['PDF', 'DOC', 'DOCX', 'TXT', 'RTF', 'ODT', 'HTML'],
          ['PDF', 'DOCX', 'TXT', 'RTF', 'HTML'],
        ),
      actionText: 'Convertir',
      actionIcon: Upload,
    },
    {
      id: 'archive-converter',
      title: "Convertisseur d'archives",
      description: 'Convertissez vos archives entre ZIP, RAR, 7Z, TAR et autres formats.',
      icon: File,
      status: 'available' as const,
      action: () =>
        openConversionModal(
          'archive',
          "Convertisseur d'archives",
          'Convertissez vos archives entre différents formats',
          ['ZIP', 'RAR', '7Z', 'TAR', 'GZ', 'BZ2', 'XZ'],
          ['ZIP', '7Z', 'TAR', 'GZ'],
        ),
      actionText: 'Convertir',
      actionIcon: Upload,
    },
    {
      id: 'batch-converter',
      title: 'Conversion par lot',
      description:
        'Convertissez plusieurs fichiers simultanément avec des paramètres personnalisés.',
      icon: Settings,
      status: 'available' as const,
      action: () =>
        openConversionModal(
          'batch',
          'Conversion par lot',
          'Convertissez plusieurs fichiers simultanément',
          ['Tous formats'],
          ['MP4', 'JPG', 'MP3', 'PDF', 'ZIP'],
        ),
      actionText: 'Configurer',
      actionIcon: Settings,
    },
  ]

  const openConversionModal = (
    type: string,
    title: string,
    description: string,
    supportedFormats: string[],
    outputFormats: string[],
  ) => {
    setConversionModal({
      isOpen: true,
      type,
      title,
      description,
      supportedFormats,
      outputFormats,
    })
    setSelectedFiles([])
    setOutputFormat('')
    setConversionResults([])
    setQueueItems([])
    setConversionProgress(0)
    // définir dossier par défaut en priorisant les Paramètres
    try {
      const raw = localStorage.getItem('vw_settings')
      const s = raw ? JSON.parse(raw) : null
      if (s?.conversionsDir) {
        setOutputDir(s.conversionsDir)
      } else {
        window.electronAPI.getDefaultOutputDir().then((dir) => {
          if (dir) setOutputDir(dir)
        })
      }
    } catch {
      window.electronAPI.getDefaultOutputDir().then((dir) => {
        if (dir) setOutputDir(dir)
      })
    }
  }

  const closeConversionModal = () => {
    setConversionModal(null)
    setSelectedFiles([])
    setOutputFormat('')
    setConverting(false)
    setConversionProgress(0)
    setConversionResults([])
  }

  const chooseOutputDir = async () => {
    const dir = await window.electronAPI.selectOutputDir()
    if (dir) setOutputDir(dir)
  }

  const pickFilesWithDialog = async () => {
    const filters = [
      {
        name: 'Fichiers',
        extensions: conversionModal?.supportedFormats.map((f) => f.toLowerCase()) || ['*'],
      },
    ]
    const files = await window.electronAPI.selectFiles({ filters, multi: true })
    if (files.length) {
      const mapped: SelectedFile[] = files.map((f: any) => ({
        name: f.name,
        size: f.size || 0,
        path: f.path,
      }))
      setSelectedFiles(mapped)
    }
  }

  const startNativeConversion = async () => {
    if (!outputFormat || selectedFiles.length === 0 || !conversionModal) return
    setConverting(true)
    setConversionProgress(0)
    setConversionResults([])
    setQueueItems(selectedFiles.map((f) => ({ name: f.name, status: 'pending' as QueueStatus })))
    const files = selectedFiles.map((f: any) => ({ path: f.path, name: f.name }))
    await window.electronAPI.convertFiles({
      type: conversionModal.type as any,
      files,
      outputFormat,
      outputDir,
      sessionId: (window as any).__vw_conv_sid,
      options: { videoCrf, videoPreset, audioBitrateK },
    })
  }

  const exportLogs = async () => {
    try {
      const sid = (window as any).__vw_conv_sid
      const p =
        sid && (window as any).electronAPI?.convertGetLogFile
          ? await (window as any).electronAPI.convertGetLogFile(sid)
          : null
      if (p && typeof p === 'string') {
        const dir = p.replace(/\\[^\\]*$/, '')
        await (window as any).electronAPI.openFolder(dir)
        return
      }
    } catch {}
    const lines: string[] = []
    try {
      lines.push(`[Session] ${(window as any).__vw_conv_sid || 'unknown'}`)
      lines.push(`[Started] ${new Date().toISOString()}`)
      if (queueItems.length) {
        lines.push('[Queue]')
        queueItems.forEach((q) => lines.push(`  - ${q.name} : ${q.status}`))
      }
      if (conversionResults.length) {
        lines.push('[Results]')
        conversionResults.forEach((r) =>
          lines.push(
            `  - ${r.original} -> ${r.converted || ''} : ${r.success ? 'OK' : r.error || 'ERROR'}`,
          ),
        )
      }
    } catch {}
    const text = lines.join('\n')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `convert-log-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const runChocoElevatedStep = (args: string[], label: string) => {
    return new Promise<boolean>((resolve) => {
      const sessionId = 'convtools-' + Math.random().toString(36).slice(2)
      try {
        pushToast({ kind: 'info', text: label })
      } catch {}
      const onExit = (msg: any) => {
        if (!msg || msg.sessionId !== sessionId) return
        try {
          window.electronAPI.offChocoExit(onExit)
        } catch {}
        resolve(msg.code === 0)
      }
      try {
        window.electronAPI.onChocoExit(onExit)
      } catch {}
      window.electronAPI
        .chocoRunElevated(args, sessionId)
        .then((ok: any) => {
          if (!ok || (ok && typeof ok === 'object' && ok.ok === false)) {
            try {
              window.electronAPI.offChocoExit(onExit)
            } catch {}
            resolve(false)
          }
        })
        .catch(() => {
          try {
            window.electronAPI.offChocoExit(onExit)
          } catch {}
          resolve(false)
        })
    })
  }

  const installAllTools = async () => {
    if (installingAll) return
    if (missingPkgs.length === 0) {
      try {
        pushToast({ kind: 'success', text: 'Tous les outils sont déjà installés' })
      } catch {}
      return
    }
    setInstallingAll(true)
    try {
      // Étapes de réparation avant installation
      const steps: Array<{ args: string[]; label: string }> = [
        {
          args: ['source', 'enable', '-n=chocolatey'],
          label: 'Activation de la source Chocolatey…',
        },
        {
          args: ['upgrade', 'chocolatey', '-y', '--no-progress'],
          label: 'Mise à jour de Chocolatey…',
        },
        {
          args: ['install', 'chocolatey-core.extension', '-y', '--no-progress'],
          label: 'Installation de chocolatey-core.extension…',
        },
        { args: ['clean', '-y'], label: 'Nettoyage du cache Chocolatey…' },
        {
          args: ['uninstall', 'KB2919355', 'KB2919442', '-y', '--force', '--no-progress'],
          label: 'Désinstallation des anciens paquets KB…',
        },
        {
          args: ['install', ...missingPkgs, '-y', '--no-progress'],
          label: `Installation des outils: ${missingPkgs.join(', ')}…`,
        },
      ]
      for (const s of steps) {
        const ok = await runChocoElevatedStep(s.args, s.label)
        if (!ok) {
          try {
            pushToast({ kind: 'error', text: `Échec: ${s.label}` })
          } catch {}
          setInstallingAll(false)
          return
        }
      }
      try {
        pushToast({ kind: 'success', text: 'Installation terminée' })
      } catch {}
      try {
        const t = await window.electronAPI.detectConverters()
        if (t) setTools(t)
      } catch {}
    } finally {
      setInstallingAll(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
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
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={28} color="white" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1
                style={{
                  fontSize: '36px',
                  fontWeight: '800',
                  margin: 0,
                  backgroundImage: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Convertisseur de Fichiers
              </h1>
              {missingCount > 0 && (
                <div
                  style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
                >
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#fff',
                      background: 'linear-gradient(135deg,#EF4444 0%, #DC2626 100%)',
                      border: '1px solid rgba(239,68,68,0.5)',
                    }}
                  >
                    Outils manquants ({missingCount})
                  </span>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={installingAll}
                    onClick={installAllTools}
                  >
                    {installingAll ? (
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Settings size={16} /> Installation…
                      </motion.span>
                    ) : (
                      'Installer tout'
                    )}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => navigate('/chocolatey')}>
                    Ouvrir Chocolatey
                  </Button>
                </div>
              )}
            </div>
            <p
              style={{
                fontSize: '16px',
                color: 'rgba(255, 255, 255, 0.7)',
                margin: 0,
              }}
            >
              Convertissez vos fichiers entre différents formats rapidement
            </p>
          </div>
        </div>
      </motion.div>

      {/* Badge seul → pas de panneau de liste des outils ici */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '24px',
        }}
      >
        {converterTools.map((tool, index) => (
          <UnifiedTile
            key={tool.title}
            title={tool.title}
            description={tool.description}
            icon={tool.icon}
            status={tool.status}
            onAction={tool.action}
            onLaunch={tool.action}
            index={index}
          />
        ))}
      </div>

      {/* Modale de conversion */}
      <AnimatePresence>
        {conversionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={modalBackdrop}
            onClick={closeConversionModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={modalCard}
              onClick={(e) => e.stopPropagation()}
            >
              {/* En-tête de la modale */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '24px',
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#FFFFFF' }}>
                    {conversionModal.title}
                  </h2>
                  <p style={{ margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.7)' }}>
                    {conversionModal.description}
                  </p>
                </div>
                <button onClick={closeConversionModal} title="Fermer" style={closeBtn}>
                  <X size={24} />
                </button>
              </div>

              {/* Zone de sélection de fichiers */}
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}
                >
                  <label
                    style={{
                      display: 'block',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#FFFFFF',
                    }}
                  >
                    Sélectionner les fichiers
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={pickFilesWithDialog}
                    title="Choisir des fichiers"
                  >
                    Parcourir…
                  </Button>
                </div>
                <div
                  style={{
                    border: '2px dashed rgba(255, 255, 255, 0.3)',
                    borderRadius: '12px',
                    padding: '32px',
                    textAlign: 'center',
                    background: 'rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#F59E0B'
                    e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <input
                    type="file"
                    multiple
                    aria-label="Ajouter des fichiers"
                    accept={conversionModal?.supportedFormats.map((f) => f.toLowerCase()).join(',')}
                    onChange={(e) =>
                      setSelectedFiles(
                        Array.from(e.target.files || []).map((f: any) => ({
                          name: f.name,
                          size: f.size || 0,
                          path: f.path,
                        })),
                      )
                    }
                    style={{ display: 'none' }}
                    id="file-input"
                  />
                  <label
                    htmlFor="file-input"
                    style={{ cursor: 'pointer' }}
                    title="Ajouter des fichiers"
                  >
                    <FileUp
                      size={48}
                      color="rgba(255, 255, 255, 0.5)"
                      style={{ marginBottom: '16px' }}
                    />
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#FFFFFF',
                        marginBottom: '8px',
                      }}
                    >
                      Cliquez pour sélectionner des fichiers
                    </div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      Formats supportés: {conversionModal?.supportedFormats.join(', ')}
                    </div>
                  </label>
                </div>
              </div>

              {/* Dossier de sortie */}
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <label style={{ fontSize: 16, fontWeight: 600, color: '#fff' }} htmlFor="outdir">
                    Dossier de sortie
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={chooseOutputDir}
                    title="Choisir un dossier de sortie"
                  >
                    Modifier…
                  </Button>
                </div>
                <div
                  id="outdir"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: 14,
                  }}
                >
                  {outputDir || 'Non défini'}
                </div>
              </div>

              {/* Fichiers sélectionnés */}
              {selectedFiles.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#FFFFFF',
                      marginBottom: '12px',
                    }}
                  >
                    Fichiers sélectionnés ({selectedFiles.length})
                  </h3>
                  <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                    {selectedFiles.map((file: SelectedFile, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px 12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          marginBottom: '8px',
                        }}
                      >
                        <File size={16} color="rgba(255, 255, 255, 0.6)" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', color: '#FFFFFF' }}>{file.name}</div>
                          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                            {formatFileSize(file.size || 0)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sélection du format de sortie */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#FFFFFF',
                    marginBottom: '12px',
                  }}
                  htmlFor="formatSelect"
                >
                  Format de sortie
                </label>
                <select
                  id="formatSelect"
                  title="Sélectionner le format de sortie"
                  aria-label="Format de sortie"
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    outline: 'none',
                  }}
                >
                  <option value="">Sélectionner un format</option>
                  {conversionModal?.outputFormats.map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              </div>

              {/* Options avancées */}
              {(conversionModal.type === 'video' || conversionModal.type === 'audio') && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: conversionModal.type === 'video' ? '1fr 1fr 1fr' : '1fr',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  {conversionModal.type === 'video' && (
                    <>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                          Préréglage
                        </span>
                        <select
                          aria-label="Préréglage qualité"
                          value={qualityPreset}
                          onChange={(e) => {
                            const v = e.target.value as 'eco' | 'standard' | 'high'
                            setQualityPreset(v)
                            if (v === 'eco') {
                              setVideoCrf(30)
                              setVideoPreset('faster')
                              setAudioBitrateK(128)
                            } else if (v === 'high') {
                              setVideoCrf(20)
                              setVideoPreset('slow')
                              setAudioBitrateK(256)
                            } else {
                              setVideoCrf(23)
                              setVideoPreset('medium')
                              setAudioBitrateK(192)
                            }
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: 'rgba(255,255,255,0.06)',
                            color: '#fff',
                          }}
                        >
                          <option value="eco">Éco (petit fichier)</option>
                          <option value="standard">Standard</option>
                          <option value="high">Élevée (qualité)</option>
                        </select>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                          Qualité (CRF)
                        </span>
                        <input
                          aria-label="Valeur CRF"
                          type="number"
                          min={0}
                          max={51}
                          value={videoCrf}
                          onChange={(e) =>
                            setVideoCrf(Math.min(51, Math.max(0, Number(e.target.value) || 23)))
                          }
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: 'rgba(255,255,255,0.06)',
                            color: '#fff',
                          }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Preset</span>
                        <select
                          aria-label="Preset vidéo"
                          value={videoPreset}
                          onChange={(e) => setVideoPreset(e.target.value as any)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: 'rgba(255,255,255,0.06)',
                            color: '#fff',
                          }}
                        >
                          {[
                            'ultrafast',
                            'superfast',
                            'veryfast',
                            'faster',
                            'fast',
                            'medium',
                            'slow',
                            'slower',
                            'veryslow',
                          ].map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                      Bitrate audio (kbps)
                    </span>
                    <input
                      aria-label="Bitrate audio en kbps"
                      type="number"
                      min={64}
                      max={512}
                      step={16}
                      value={audioBitrateK}
                      onChange={(e) =>
                        setAudioBitrateK(Math.min(512, Math.max(64, Number(e.target.value) || 192)))
                      }
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'rgba(255,255,255,0.06)',
                        color: '#fff',
                      }}
                    />
                  </label>
                </div>
              )}

              {/* Boutons Conversion */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <Button
                  aria-label="Lancer la conversion"
                  onClick={startNativeConversion}
                  disabled={!outputFormat || selectedFiles.length === 0 || converting}
                  variant="warn"
                  size="lg"
                  style={{ borderRadius: 12, flex: 1 }}
                >
                  {converting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Settings size={20} />
                      </motion.div>
                      Conversion en cours... {Math.round(conversionProgress)}%
                    </>
                  ) : (
                    <>
                      <FileDown size={20} />
                      Convertir {selectedFiles.length} fichier{selectedFiles.length > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
                <Button
                  aria-label="Pause"
                  variant="outline"
                  size="lg"
                  disabled={!converting}
                  onClick={async () => {
                    const sid = (window as any).__vw_conv_sid
                    if (sid) await window.electronAPI.convertPause(sid)
                  }}
                >
                  Pause
                </Button>
                <Button
                  aria-label="Reprendre"
                  variant="outline"
                  size="lg"
                  disabled={!converting}
                  onClick={async () => {
                    const sid = (window as any).__vw_conv_sid
                    if (sid) await window.electronAPI.convertResume(sid)
                  }}
                >
                  Reprendre
                </Button>
                <Button
                  aria-label="Sauter le fichier courant"
                  variant="outline"
                  size="lg"
                  disabled={!converting}
                  onClick={async () => {
                    const sid = (window as any).__vw_conv_sid
                    if (sid) await window.electronAPI.convertSkip(sid)
                  }}
                >
                  Sauter
                </Button>
                <Button
                  aria-label="Annuler la conversion"
                  variant="outline"
                  size="lg"
                  disabled={!converting}
                  onClick={async () => {
                    const sid = (window as any).__vw_conv_sid
                    if (sid) {
                      await window.electronAPI.convertCancel(sid)
                      setConverting(false)
                    }
                  }}
                >
                  Annuler
                </Button>
              </div>

              {/* Barre de progression */}
              {converting && (
                <div style={{ marginBottom: '24px' }}>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(0, Math.min(100, conversionProgress || 0))}%` }}
                      style={{
                        height: '100%',
                        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                    {doneCount}/{selectedFiles.length} terminé(s)
                  </div>
                </div>
              )}

              {/* File d'attente */}
              {queueItems.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: 8 }}>
                    File d'attente
                  </h3>
                  <div style={{ maxHeight: 200, overflow: 'auto' }}>
                    {queueItems.map((qi, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '6px 10px',
                          borderRadius: 8,
                          background: 'rgba(255,255,255,0.05)',
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ color: '#fff', fontSize: 13 }}>{qi.name}</span>
                        <span
                          style={{
                            fontSize: 12,
                            color:
                              qi.status === 'done'
                                ? '#10B981'
                                : qi.status === 'error'
                                  ? '#EF4444'
                                  : '#F59E0B',
                          }}
                        >
                          {qi.status === 'pending'
                            ? 'En attente'
                            : qi.status === 'processing'
                              ? 'En cours'
                              : qi.status === 'done'
                                ? 'OK'
                                : 'Erreur'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Résultats de conversion */}
              {conversionResults.length > 0 && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#FFFFFF',
                        marginBottom: '12px',
                      }}
                    >
                      Résultats de conversion
                    </h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {outputDir && doneCount > 0 && (
                        <Button
                          aria-label="Ouvrir le dossier de sortie"
                          variant="ghost"
                          size="sm"
                          onClick={() => window.electronAPI.openFolder(outputDir)}
                          title="Ouvrir le dossier de sortie"
                        >
                          Ouvrir le dossier
                        </Button>
                      )}
                      <Button
                        aria-label="Exporter logs"
                        variant="outline"
                        size="sm"
                        onClick={exportLogs}
                        title="Exporter logs"
                      >
                        Exporter logs
                      </Button>
                    </div>
                  </div>
                  <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                    {conversionResults.map((result, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px 12px',
                          background: result.success
                            ? 'rgba(16, 185, 129, 0.1)'
                            : 'rgba(239, 68, 68, 0.1)',
                          border: `1px solid ${result.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          borderRadius: '8px',
                          marginBottom: '8px',
                        }}
                      >
                        {result.success ? (
                          <CheckCircle size={16} color="#10B981" />
                        ) : (
                          <AlertCircle size={16} color="#EF4444" />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', color: '#FFFFFF' }}>
                            {result.original} → {result.converted}
                          </div>
                          {result.error && (
                            <div style={{ fontSize: '12px', color: '#EF4444' }}>{result.error}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default FileConverterPage
