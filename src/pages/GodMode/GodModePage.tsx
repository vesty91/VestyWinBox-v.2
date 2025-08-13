import { motion } from 'framer-motion'
import { Database, Heart, Lock, Monitor, Search, Settings, Shield, Zap } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import UnifiedTile from '../../components/UnifiedTile/UnifiedTile'
import { t } from '../../i18n'
import Button from '../../ui/components/Button'
import { pushToast } from '../../ui/components/Toaster'
import { input as inputTokens, select as selectTokens, surface } from '../../ui/styles/tokens'

const GodModePage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalMessage, setModalMessage] = useState('')
  const [modalConfirmText, setModalConfirmText] = useState('Confirmer')
  const [modalCancelText, setModalCancelText] = useState('Annuler')
  const [showTextInput, setShowTextInput] = useState(false)
  const [textInputValue, setTextInputValue] = useState('')
  const [onConfirm, setOnConfirm] = useState<null | (() => Promise<void> | void)>(null)
  const [modalType, setModalType] = useState<'info' | 'warning' | 'danger' | 'success'>('info')
  const [isConfirming, setIsConfirming] = useState(false)
  const [dontShowKey, setDontShowKey] = useState<string | null>(null)
  const [dontShowChecked, setDontShowChecked] = useState(false)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const [modalOptions, setModalOptions] = useState<
    {
      label: string
      onClick: () => Promise<void> | void
      type?: 'info' | 'warning' | 'danger' | 'success'
    }[]
  >([])
  const [searchQuery, setSearchQuery] = useState('')
  const [blDrives, setBlDrives] = useState<
    { letter: string; protection: string; status: string; percent: number | null }[]
  >([])
  const [wuPauseDays, setWuPauseDays] = useState<number>(7)
  const [defExclusions, setDefExclusions] = useState<string[]>([])
  const [actionLog, setActionLog] = useState<{ ts: number; text: string }[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        if (window.electronAPI?.bitlockerStatus) {
          const st = await window.electronAPI.bitlockerStatus()
          setBlDrives(st || [])
        }
        if (window.electronAPI?.defenderListExclusions) {
          const ex = await window.electronAPI.defenderListExclusions()
          setDefExclusions(ex || [])
        }
      } catch {}
    })()
  }, [])

  const closeModal = useCallback(() => {
    if (isConfirming) return
    setModalOpen(false)
    setShowTextInput(false)
    setTextInputValue('')
    setOnConfirm(null)
    setModalType('info')
    setDontShowKey(null)
    setDontShowChecked(false)
    setModalOptions([])
  }, [isConfirming])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!modalOpen) return
      if (e.key === 'Escape') {
        e.preventDefault()
        closeModal()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen, closeModal])

  const typeStyles = {
    info: {
      header: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
      button: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    },
    warning: {
      header: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      button: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    },
    danger: {
      header: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      button: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    },
    success: {
      header: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      button: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    },
  }

  type ModalOptions = {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => Promise<void> | void
    withInput?: { placeholder?: string; initial?: string }
    type?: 'info' | 'warning' | 'danger' | 'success'
    dontShowKey?: string
    options?: {
      label: string
      onClick: () => Promise<void> | void
      type?: 'info' | 'warning' | 'danger' | 'success'
    }[]
  }

  const openConfirmModal = (opts: ModalOptions) => {
    // Skip si l’utilisateur a coché "ne plus afficher" pour cette clé
    if (opts.dontShowKey && localStorage.getItem(`vwbox_modal_skip_${opts.dontShowKey}`) === '1') {
      opts.onConfirm()
      return
    }

    setModalTitle(opts.title)
    setModalMessage(opts.message)
    setModalConfirmText(opts.confirmText || 'Confirmer')
    setModalCancelText(opts.cancelText || 'Annuler')
    setShowTextInput(!!opts.withInput)
    setTextInputValue(opts.withInput?.initial || '')
    setOnConfirm(() => opts.onConfirm)
    setModalType(opts.type || 'info')
    setDontShowKey(opts.dontShowKey || null)
    setDontShowChecked(false)
    setModalOptions(opts.options || [])
    setModalOpen(true)
  }

  const notify = (msg: string) => pushToast({ kind: 'success', text: msg })
  const notifyErr = (msg: string) => pushToast({ kind: 'error', text: msg })

  const log = (text: string) =>
    setActionLog((prev) => [{ ts: Date.now(), text }, ...prev].slice(0, 200))

  const actions = {
    secureBoot: async () => {
      openConfirmModal({
        title: 'Vérifier Secure Boot',
        message: "Souhaitez-vous vérifier l'état du Secure Boot ? (UEFI requis)",
        confirmText: 'Vérifier',
        type: 'info',
        onConfirm: async () => {
          try {
            const status = await window.electronAPI.checkSecureBootStatus()
            if (status === true) notify('Secure Boot: ACTIVÉ')
            else if (status === false) notify('Secure Boot: DÉSACTIVÉ')
            else notify('Secure Boot: INCONNU')
          } catch {
            notifyErr('Erreur Secure Boot')
          }
          closeModal()
        },
      })
    },
    uac: async () => {
      openConfirmModal({
        title: 'Activer UAC',
        message: "Activer UAC nécessite un redémarrage pour s'appliquer. Continuer ?",
        confirmText: 'Activer',
        type: 'warning',
        dontShowKey: 'uac_enable',
        onConfirm: async () => {
          try {
            const ok = await window.electronAPI.setUACEnabled(true)
            ok ? notify('UAC activé (redémarrage requis)') : notifyErr('Échec activation UAC')
          } catch {
            notifyErr('Erreur UAC')
          }
          closeModal()
        },
      })
    },
    restorePoint: async () => {
      openConfirmModal({
        title: 'Créer un point de restauration',
        message: 'Entrez une description (optionnelle) pour le point de restauration :',
        confirmText: 'Créer',
        type: 'info',
        onConfirm: async () => {
          try {
            const ok = await window.electronAPI.createRestorePoint(textInputValue || 'VestyWinBox')
            ok ? notify('Point de restauration créé') : notifyErr('Échec création point')
          } catch {
            notifyErr('Erreur point de restauration')
          }
          closeModal()
        },
        withInput: { placeholder: 'Description', initial: 'VestyWinBox' },
      })
    },
    batteryReport: async () => {
      openConfirmModal({
        title: 'Rapport batterie',
        message: "Générer un rapport détaillé de l'état de la batterie.",
        confirmText: 'Générer',
        type: 'info',
        onConfirm: async () => {
          try {
            const p = await window.electronAPI.generateBatteryReport()
            if (p) {
              notify('Rapport batterie créé sur le Bureau')
              await window.electronAPI.openFolder(p.replace(/\\[^\\]*$/, ''))
            } else notifyErr('Échec génération rapport')
          } catch {
            notifyErr('Erreur rapport batterie')
          }
          closeModal()
        },
      })
    },
    systemHealth: async () => {
      openConfirmModal({
        title: 'Santé système',
        message:
          'Lancer DISM RestoreHealth puis SFC /scannow (fenêtre admin) ? Cela peut prendre du temps.',
        confirmText: 'Lancer',
        type: 'warning',
        onConfirm: async () => {
          try {
            const ok = await window.electronAPI.runSystemHealthScan()
            ok ? notify('Scan santé système lancé') : notifyErr('Échec lancement scan')
          } catch {
            notifyErr('Erreur santé système')
          }
          closeModal()
        },
      })
    },
    performance: async () => {
      openConfirmModal({
        title: 'Ultimate Performance',
        message: "Activer le plan d'alimentation Ultimate Performance ? (admin)",
        confirmText: 'Activer',
        type: 'info',
        onConfirm: async () => {
          try {
            const ok = await window.electronAPI.setUltimatePerformancePlan()
            ok ? notify('Plan Ultimate Performance activé') : notifyErr('Échec activation plan')
          } catch {
            notifyErr('Erreur performance')
          }
          closeModal()
        },
      })
    },
    showHidden: async (enable: boolean) => {
      openConfirmModal({
        title: enable ? 'Afficher fichiers cachés' : 'Masquer fichiers cachés',
        message: enable
          ? 'Afficher tous les fichiers/dossiers cachés et protégés ?'
          : 'Masquer les fichiers/dossiers cachés ?',
        confirmText: enable ? 'Afficher' : 'Masquer',
        type: 'info',
        onConfirm: async () => {
          const ok = await window.electronAPI.setShowHiddenFiles(enable)
          ok
            ? notify(enable ? 'Fichiers cachés: affichés' : 'Fichiers cachés: masqués')
            : notifyErr('Échec opération')
          await window.electronAPI.restartExplorer()
          closeModal()
        },
      })
    },
    showExtensions: async (enable: boolean) => {
      openConfirmModal({
        title: enable ? 'Afficher extensions' : 'Masquer extensions',
        message: enable
          ? 'Afficher les extensions des fichiers ?'
          : 'Masquer les extensions des fichiers ?',
        confirmText: enable ? 'Afficher' : 'Masquer',
        type: 'info',
        onConfirm: async () => {
          const ok = await window.electronAPI.setShowFileExtensions(enable)
          ok
            ? notify(enable ? 'Extensions: affichées' : 'Extensions: masquées')
            : notifyErr('Échec opération')
          await window.electronAPI.restartExplorer()
          closeModal()
        },
      })
    },
    flushDNS: async () => {
      openConfirmModal({
        title: 'Flush DNS',
        message: 'Vider le cache DNS maintenant ?',
        confirmText: 'Exécuter',
        type: 'info',
        onConfirm: async () => {
          const ok = await window.electronAPI.flushDNS()
          ok ? notify('Cache DNS vidé') : notifyErr('Échec flush DNS')
          closeModal()
        },
      })
    },
    // Outils système directs
    eventViewer: async () => {
      await window.electronAPI.openEventViewer()
      notify('Observateur d’événements ouvert')
    },
    taskScheduler: async () => {
      await window.electronAPI.openTaskScheduler()
      notify('Planificateur de tâches ouvert')
    },
    computerManagement: async () => {
      await window.electronAPI.openComputerManagement()
      notify('Gestion de l’ordinateur ouverte')
    },
    performanceMonitor: async () => {
      await window.electronAPI.openPerformanceMonitor()
      notify('Moniteur de performances ouvert')
    },
    systemInfo: async () => {
      await window.electronAPI.openSystemInfo()
      notify('Informations système ouvertes')
    },
    programsAndFeatures: async () => {
      await window.electronAPI.openProgramsAndFeatures()
      notify('Programmes et fonctionnalités ouvert')
    },
    windowsFeatures: async () => {
      await window.electronAPI.openWindowsFeatures()
      notify('Fonctionnalités Windows ouvert')
    },
    networkConnections: async () => {
      await window.electronAPI.openNetworkConnections()
      notify('Connexions réseau ouvertes')
    },
    firewallControl: async () => {
      await window.electronAPI.openFirewallControl()
      notify('Pare-feu Windows ouvert')
    },
    groupPolicy: async () => {
      await window.electronAPI.openGroupPolicy()
      notify('Stratégie de groupe locale ouverte')
    },
    localSecurityPolicy: async () => {
      await window.electronAPI.openLocalSecurityPolicy()
      notify('Stratégie de sécurité locale ouverte')
    },
    systemPropertiesAdvanced: async () => {
      await window.electronAPI.openSystemPropertiesAdvanced()
      notify('Propriétés système (avancé) ouvertes')
    },
    environmentVariables: async () => {
      await window.electronAPI.openEnvironmentVariablesDialog()
      notify('Variables d’environnement ouvertes')
    },
    godmodeFolder: async () => {
      openConfirmModal({
        title: 'Dossier GodMode',
        message: 'Créer/Ouvrir le dossier GodMode sur le Bureau ?',
        confirmText: 'Ouvrir',
        type: 'info',
        onConfirm: async () => {
          const ok = await window.electronAPI.openWindowsGodModeFolder()
          ok ? notify('Dossier GodMode ouvert') : notifyErr('Échec GodMode folder')
          closeModal()
        },
      })
    },
    firewall: async (enable: boolean) => {
      openConfirmModal({
        title: enable ? 'Activer Pare-feu' : 'Désactiver Pare-feu',
        message: enable
          ? 'Activer le pare-feu pour tous les profils ?'
          : 'Désactiver le pare-feu pour tous les profils ?',
        confirmText: enable ? 'Activer' : 'Désactiver',
        type: enable ? 'warning' : 'danger',
        onConfirm: async () => {
          const ok = await window.electronAPI.setFirewallEnabled(enable)
          ok
            ? notify(enable ? 'Pare-feu activé' : 'Pare-feu désactivé')
            : notifyErr('Échec pare-feu')
          closeModal()
        },
      })
    },
    theme: async (dark: boolean) => {
      openConfirmModal({
        title: dark ? 'Activer mode sombre' : 'Activer mode clair',
        message: dark
          ? 'Basculer le thème Windows en sombre ?'
          : 'Basculer le thème Windows en clair ?',
        confirmText: 'Appliquer',
        type: 'info',
        onConfirm: async () => {
          const ok = await window.electronAPI.setDarkMode(dark)
          ok
            ? notify(dark ? 'Mode sombre appliqué' : 'Mode clair appliqué')
            : notifyErr('Échec changement thème')
          await window.electronAPI.restartExplorer()
          closeModal()
        },
      })
    },
    resetNet: async () => {
      openConfirmModal({
        title: 'Réinitialiser réseau',
        message: 'Réinitialiser IP/Winsock et renouveler l’IP (admin) ?',
        confirmText: 'Réinitialiser',
        type: 'warning',
        onConfirm: async () => {
          const ok = await window.electronAPI.resetNetworkStack()
          ok ? notify('Pile réseau réinitialisée') : notifyErr('Échec réinitialisation réseau')
          closeModal()
        },
      })
    },
    defenderRealtime: async (enable: boolean) => {
      openConfirmModal({
        title: enable ? 'Activer Defender (temps réel)' : 'Désactiver Defender (temps réel)',
        message: enable
          ? 'Activer la protection temps réel de Windows Defender ?'
          : 'Désactiver la protection temps réel de Windows Defender ? (temporaire)',
        confirmText: enable ? 'Activer' : 'Désactiver',
        type: enable ? 'info' : 'warning',
        onConfirm: async () => {
          const ok = await window.electronAPI.setDefenderRealtime(enable)
          ok
            ? notify(enable ? 'Defender temps réel activé' : 'Defender temps réel désactivé')
            : notifyErr('Échec Defender')
          closeModal()
        },
      })
    },
    windowsUpdatePause: async (pause: boolean) => {
      openConfirmModal({
        title: pause ? 'Mettre en pause Windows Update' : 'Relancer Windows Update',
        message: pause
          ? 'Arrêter les services Windows Update (admin) ?'
          : 'Redémarrer les services Windows Update ? ',
        confirmText: pause ? 'Mettre en pause' : 'Relancer',
        type: 'info',
        onConfirm: async () => {
          const ok = await window.electronAPI.setWindowsUpdatePaused(pause)
          ok
            ? notify(pause ? 'Windows Update en pause' : 'Windows Update relancé')
            : notifyErr('Échec Windows Update')
          log(pause ? `WU: pause immédiate` : `WU: reprise immédiate`)
          closeModal()
        },
      })
    },
    windowsUpdatePauseDays: async () => {
      openConfirmModal({
        title: 'Pause Windows Update (durée)',
        message: 'Choisir la durée de pause (7/14/35 jours) puis confirmer.',
        confirmText: 'Planifier',
        type: 'info',
        onConfirm: async () => {
          const ok = await window.electronAPI.windowsUpdatePauseDays(wuPauseDays)
          ok
            ? notify(`Windows Update en pause ${wuPauseDays} j (reprise planifiée)`)
            : notifyErr('Échec planification pause')
          if (ok) log(`WU: pause ${wuPauseDays} jours planifiée`)
          closeModal()
        },
      })
    },
    bitlocker: async (enable: boolean) => {
      openConfirmModal({
        title: enable ? 'Activer BitLocker' : 'Désactiver BitLocker',
        message: enable
          ? 'Activer le chiffrement BitLocker sur C: ? (clé de récupération requise)'
          : 'Désactiver BitLocker sur C: ? (admin)',
        confirmText: enable ? 'Activer' : 'Désactiver',
        type: 'warning',
        onConfirm: async () => {
          const ok = await window.electronAPI.setBitLockerEnabled(enable)
          ok
            ? notify(enable ? 'BitLocker activé (en cours)' : 'BitLocker désactivé (en cours)')
            : notifyErr('Échec BitLocker')
          if (ok) log(enable ? 'BitLocker: activation (C:)' : 'BitLocker: désactivation (C:)')
          closeModal()
        },
      })
    },
    wuCache: async () => {
      openConfirmModal({
        title: 'Nettoyer Windows Update',
        message: 'Vider le cache Windows Update et redémarrer les services ? (admin)',
        confirmText: 'Nettoyer',
        type: 'warning',
        onConfirm: async () => {
          const ok = await window.electronAPI.clearWindowsUpdateCache()
          ok ? notify('Cache Windows Update nettoyé') : notifyErr('Échec nettoyage WU')
          closeModal()
        },
      })
    },
    hibernate: async (enable: boolean) => {
      openConfirmModal({
        title: enable ? 'Activer hibernation' : 'Désactiver hibernation',
        message: enable
          ? 'Activer la mise en veille prolongée ?'
          : 'Désactiver la mise en veille prolongée ?',
        confirmText: enable ? 'Activer' : 'Désactiver',
        type: 'info',
        onConfirm: async () => {
          const ok = await window.electronAPI.setHibernateEnabled(enable)
          ok
            ? notify(enable ? 'Hibernation activée' : 'Hibernation désactivée')
            : notifyErr('Échec opération')
          closeModal()
        },
      })
    },
    recycleBin: async () => {
      openConfirmModal({
        title: 'Vider Corbeille',
        message: 'Vider immédiatement la corbeille pour tous les lecteurs ?',
        confirmText: 'Vider',
        type: 'danger',
        onConfirm: async () => {
          const ok = await window.electronAPI.emptyRecycleBin()
          ok ? notify('Corbeille vidée') : notifyErr('Échec vidage corbeille')
          closeModal()
        },
      })
    },
    wuSettings: async () => {
      openConfirmModal({
        title: 'Paramètres Windows Update',
        message: 'Ouvrir la page Windows Update ?',
        confirmText: 'Ouvrir',
        type: 'info',
        onConfirm: async () => {
          await window.electronAPI.openWindowsUpdateSettings()
          closeModal()
        },
      })
    },
    reboot: async () => {
      openConfirmModal({
        title: 'Redémarrer maintenant',
        message: 'Redémarrer immédiatement l’ordinateur ?',
        confirmText: 'Redémarrer',
        type: 'warning',
        onConfirm: async () => {
          await window.electronAPI.rebootNow()
          closeModal()
        },
      })
    },
    shutdown: async () => {
      openConfirmModal({
        title: 'Éteindre maintenant',
        message: 'Arrêter immédiatement l’ordinateur ?',
        confirmText: 'Éteindre',
        type: 'danger',
        onConfirm: async () => {
          await window.electronAPI.shutdownNow()
          closeModal()
        },
      })
    },
    startupFolder: async () => {
      openConfirmModal({
        title: 'Dossier Démarrage',
        message: 'Ouvrir le dossier de démarrage utilisateur ?',
        confirmText: 'Ouvrir',
        type: 'info',
        onConfirm: async () => {
          await window.electronAPI.openStartupFolder()
          closeModal()
        },
      })
    },
    fastStartup: async (enable: boolean) => {
      openConfirmModal({
        title: enable ? 'Fast Startup ON' : 'Fast Startup OFF',
        message: enable
          ? 'Activer le démarrage rapide ?'
          : 'Désactiver le démarrage rapide ? (peut résoudre des problèmes) ',
        confirmText: enable ? 'Activer' : 'Désactiver',
        type: 'info',
        onConfirm: async () => {
          const ok = await window.electronAPI.setFastStartup(enable)
          ok
            ? notify(enable ? 'Fast Startup activé' : 'Fast Startup désactivé')
            : notifyErr('Échec opération')
          closeModal()
        },
      })
    },
    remoteDesktop: async (enable: boolean) => {
      openConfirmModal({
        title: enable ? 'Activer Bureau à distance' : 'Désactiver Bureau à distance',
        message: enable
          ? 'Autoriser les connexions RDP et ouvrir le pare-feu ?'
          : 'Interdire les connexions RDP ?',
        confirmText: enable ? 'Activer' : 'Désactiver',
        type: 'warning',
        onConfirm: async () => {
          const ok = await window.electronAPI.setRemoteDesktop(enable)
          ok ? notify(enable ? 'RDP activé' : 'RDP désactivé') : notifyErr('Échec opération')
          closeModal()
        },
      })
    },
  }

  const godModeTools = [
    // === SÉCURITÉ ET SYSTÈME ===
    {
      id: 'secure-boot',
      title: 'Secure Boot',
      description: 'Configurez et gérez le démarrage sécurisé UEFI.',
      icon: Lock,
      status: 'available' as const,
      action: actions.secureBoot,
      actionText: 'Vérifier',
      actionIcon: Settings,
      category: 'Sécurité',
    },
    {
      id: 'uac',
      title: 'Contrôle de compte utilisateur',
      description: 'Paramétrez les niveaux de sécurité UAC.',
      icon: Shield,
      status: 'available' as const,
      action: actions.uac,
      actionText: 'Activer',
      actionIcon: Settings,
      category: 'Sécurité',
    },
    {
      id: 'firewall-on',
      title: 'Firewall ON',
      description: 'Activer le pare-feu Windows (tous profils).',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.firewall(true),
      actionText: 'Activer',
      actionIcon: Settings,
      category: 'Sécurité',
    },
    {
      id: 'firewall-off',
      title: 'Firewall OFF',
      description: 'Désactiver le pare-feu Windows (tous profils).',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.firewall(false),
      actionText: 'Désactiver',
      actionIcon: Settings,
      category: 'Sécurité',
    },
    {
      id: 'defender-on',
      title: 'Defender ON (temps réel)',
      description: 'Activer la protection temps réel de Defender.',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.defenderRealtime(true),
      actionText: 'Activer',
      actionIcon: Settings,
      category: 'Sécurité',
    },
    {
      id: 'defender-off',
      title: 'Defender OFF (temps réel)',
      description: 'Désactiver temporairement la protection temps réel.',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.defenderRealtime(false),
      actionText: 'Désactiver',
      actionIcon: Settings,
      category: 'Sécurité',
    },
    {
      id: 'rdp-on',
      title: 'Bureau à distance ON',
      description: 'Autoriser les connexions RDP et règle pare-feu.',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.remoteDesktop(true),
      actionText: 'Activer',
      actionIcon: Settings,
      category: 'Sécurité',
    },
    {
      id: 'rdp-off',
      title: 'Bureau à distance OFF',
      description: 'Interdire les connexions RDP.',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.remoteDesktop(false),
      actionText: 'Désactiver',
      actionIcon: Settings,
      category: 'Sécurité',
    },

    // === MAINTENANCE SYSTÈME ===
    {
      id: 'restore-point',
      title: 'Point de restauration',
      description: 'Créez et gérez les points de restauration système.',
      icon: Database,
      status: 'available' as const,
      action: actions.restorePoint,
      actionText: 'Créer',
      actionIcon: Database,
      category: 'Maintenance',
    },
    {
      id: 'system-health',
      title: 'Santé système',
      description: 'Diagnostiquez et réparez les problèmes système.',
      icon: Heart,
      status: 'available' as const,
      action: actions.systemHealth,
      actionText: 'Diagnostiquer',
      actionIcon: Heart,
      category: 'Maintenance',
    },
    {
      id: 'performance',
      title: 'Optimisation performance',
      description: 'Optimisez les performances système avancées.',
      icon: Zap,
      status: 'available' as const,
      action: actions.performance,
      actionText: 'Optimiser',
      actionIcon: Zap,
      category: 'Maintenance',
    },
    {
      id: 'wu-cache',
      title: 'Windows Update cache',
      description: 'Nettoyer le cache Windows Update.',
      icon: Settings,
      status: 'available' as const,
      action: actions.wuCache,
      actionText: 'Nettoyer',
      actionIcon: Settings,
      category: 'Maintenance',
    },
    {
      id: 'wu-pause',
      title: 'Windows Update: Pause',
      description: 'Mettre en pause les services Windows Update.',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.windowsUpdatePause(true),
      actionText: 'Pause',
      actionIcon: Settings,
      category: 'Maintenance',
    },
    {
      id: 'wu-resume',
      title: 'Windows Update: Reprendre',
      description: 'Relancer les services Windows Update.',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.windowsUpdatePause(false),
      actionText: 'Reprendre',
      actionIcon: Settings,
      category: 'Maintenance',
    },
    {
      id: 'recycle-bin',
      title: 'Vider Corbeille',
      description: 'Supprimer les éléments de la corbeille.',
      icon: Settings,
      status: 'available' as const,
      action: actions.recycleBin,
      actionText: 'Vider',
      actionIcon: Settings,
      category: 'Maintenance',
    },
    {
      id: 'bitlocker-on',
      title: 'BitLocker ON (C:)',
      description: 'Activer le chiffrement BitLocker sur C:.',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.bitlocker(true),
      actionText: 'Activer',
      actionIcon: Settings,
      category: 'Sécurité',
    },
    {
      id: 'bitlocker-off',
      title: 'BitLocker OFF (C:)',
      description: 'Désactiver BitLocker sur C:.',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.bitlocker(false),
      actionText: 'Désactiver',
      actionIcon: Settings,
      category: 'Sécurité',
    },

    // === RÉSEAU ET CONNECTIVITÉ ===
    {
      id: 'flush-dns',
      title: 'Flush DNS',
      description: 'Vider le cache DNS (réseau).',
      icon: Settings,
      status: 'available' as const,
      action: actions.flushDNS,
      actionText: 'Exécuter',
      actionIcon: Settings,
      category: 'Réseau',
    },
    {
      id: 'reset-network',
      title: 'Réseau: réinitialiser',
      description: 'Reset IP, Winsock, flush DNS, renew.',
      icon: Settings,
      status: 'available' as const,
      action: actions.resetNet,
      actionText: 'Réinitialiser',
      actionIcon: Settings,
      category: 'Réseau',
    },

    // === AFFICHAGE ET INTERFACE ===
    {
      id: 'show-hidden',
      title: 'Fichiers cachés',
      description: 'Afficher les fichiers et dossiers cachés.',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.showHidden(true),
      actionText: 'Afficher',
      actionIcon: Settings,
      category: 'Interface',
    },
    {
      id: 'hide-hidden',
      title: 'Masquer fichiers cachés',
      description: 'Masquer les fichiers et dossiers cachés.',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.showHidden(false),
      actionText: 'Masquer',
      actionIcon: Settings,
      category: 'Interface',
    },
    {
      id: 'extensions-on',
      title: 'Extensions fichiers',
      description: 'Afficher les extensions des fichiers.',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.showExtensions(true),
      actionText: 'Afficher',
      actionIcon: Settings,
      category: 'Interface',
    },
    {
      id: 'extensions-off',
      title: 'Masquer extensions',
      description: 'Masquer les extensions des fichiers.',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.showExtensions(false),
      actionText: 'Masquer',
      actionIcon: Settings,
      category: 'Interface',
    },
    {
      id: 'dark-mode',
      title: 'Mode sombre',
      description: 'Basculer le thème Windows en sombre.',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.theme(true),
      actionText: 'Activer',
      actionIcon: Settings,
      category: 'Interface',
    },
    {
      id: 'light-mode',
      title: 'Mode clair',
      description: 'Basculer le thème Windows en clair.',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.theme(false),
      actionText: 'Activer',
      actionIcon: Settings,
      category: 'Interface',
    },

    // === OUTILS SYSTÈME ===
    {
      id: 'event-viewer',
      title: 'Observateur d’événements',
      description: 'Ouvrir l’Observateur d’événements Windows.',
      icon: Settings,
      status: 'available' as const,
      action: actions.eventViewer,
      actionText: 'Ouvrir',
      actionIcon: Settings,
      category: 'Outils',
    },
    {
      id: 'task-scheduler',
      title: 'Planificateur de tâches',
      description: 'Ouvrir le Planificateur de tâches Windows.',
      icon: Settings,
      status: 'available' as const,
      action: actions.taskScheduler,
      actionText: 'Ouvrir',
      actionIcon: Settings,
      category: 'Outils',
    },
    {
      id: 'computer-management',
      title: 'Gestion de l’ordinateur',
      description: 'Ouvrir le Gestionnaire de l’ordinateur Windows.',
      icon: Settings,
      status: 'available' as const,
      action: actions.computerManagement,
      actionText: 'Ouvrir',
      actionIcon: Settings,
      category: 'Outils',
    },
    {
      id: 'performance-monitor',
      title: 'Moniteur de performances',
      description: 'Ouvrir le Moniteur de performances Windows.',
      icon: Settings,
      status: 'available' as const,
      action: actions.performanceMonitor,
      actionText: 'Ouvrir',
      actionIcon: Settings,
      category: 'Outils',
    },
    {
      id: 'system-info',
      title: 'Informations système',
      description: 'Ouvrir les Informations système Windows.',
      icon: Settings,
      status: 'available' as const,
      action: actions.systemInfo,
      actionText: 'Ouvrir',
      actionIcon: Settings,
      category: 'Outils',
    },
    {
      id: 'programs-and-features',
      title: 'Programmes et fonctionnalités',
      description: 'Ouvrir les Programmes et fonctionnalités Windows.',
      icon: Settings,
      status: 'available' as const,
      action: actions.programsAndFeatures,
      actionText: 'Ouvrir',
      actionIcon: Settings,
      category: 'Outils',
    },
    {
      id: 'windows-features',
      title: 'Fonctionnalités Windows',
      description: 'Ouvrir les Fonctionnalités Windows.',
      icon: Settings,
      status: 'available' as const,
      action: actions.windowsFeatures,
      actionText: 'Ouvrir',
      actionIcon: Settings,
      category: 'Outils',
    },
    {
      id: 'network-connections',
      title: 'Connexions réseau',
      description: 'Ouvrir les Connexions réseau Windows.',
      icon: Settings,
      status: 'available' as const,
      action: actions.networkConnections,
      actionText: 'Ouvrir',
      actionIcon: Settings,
      category: 'Outils',
    },
    {
      id: 'firewall-control',
      title: 'Pare-feu Windows',
      description: 'Ouvrir le Pare-feu Windows.',
      icon: Settings,
      status: 'available' as const,
      action: actions.firewallControl,
      actionText: 'Ouvrir',
      actionIcon: Settings,
      category: 'Outils',
    },
    {
      id: 'group-policy',
      title: 'Stratégie de groupe locale',
      description: 'Ouvrir la Stratégie de groupe locale.',
      icon: Settings,
      status: 'available' as const,
      action: actions.groupPolicy,
      actionText: 'Ouvrir',
      actionIcon: Settings,
      category: 'Outils',
    },
    {
      id: 'local-security-policy',
      title: 'Stratégie de sécurité locale',
      description: 'Ouvrir la Stratégie de sécurité locale.',
      icon: Settings,
      status: 'available' as const,
      action: actions.localSecurityPolicy,
      actionText: 'Ouvrir',
      actionIcon: Settings,
      category: 'Outils',
    },
    {
      id: 'system-properties-advanced',
      title: 'Propriétés système (avancé)',
      description: 'Ouvrir les Propriétés système (avancé) Windows.',
      icon: Settings,
      status: 'available' as const,
      action: actions.systemPropertiesAdvanced,
      actionText: 'Ouvrir',
      actionIcon: Settings,
      category: 'Outils',
    },
    {
      id: 'environment-variables',
      title: 'Variables d’environnement',
      description: 'Ouvrir les Variables d’environnement Windows.',
      icon: Settings,
      status: 'available' as const,
      action: actions.environmentVariables,
      actionText: 'Ouvrir',
      actionIcon: Settings,
      category: 'Outils',
    },
    {
      id: 'godmode-folder',
      title: 'Dossier GodMode',
      description: 'Créer/Ouvrir le dossier GodMode Windows.',
      icon: Settings,
      status: 'available' as const,
      action: actions.godmodeFolder,
      actionText: 'Ouvrir',
      actionIcon: Settings,
      category: 'Outils',
    },
    {
      id: 'startup-folder',
      title: 'Dossier Démarrage',
      description: 'Ouvrir le dossier Startup utilisateur.',
      icon: Settings,
      status: 'available' as const,
      action: actions.startupFolder,
      actionText: 'Ouvrir',
      actionIcon: Settings,
      category: 'Outils',
    },
    {
      id: 'wu-settings',
      title: 'Windows Update',
      description: 'Ouvrir les paramètres Windows Update.',
      icon: Settings,
      status: 'available' as const,
      action: actions.wuSettings,
      actionText: 'Ouvrir',
      actionIcon: Settings,
      category: 'Outils',
    },

    // === DIAGNOSTIC ET MONITORING ===
    {
      id: 'battery-report',
      title: 'Rapport batterie',
      description: "Générez un rapport détaillé de l'état de la batterie.",
      icon: Monitor,
      status: 'available' as const,
      action: actions.batteryReport,
      actionText: 'Générer',
      actionIcon: Monitor,
      category: 'Diagnostic',
    },

    // === ALIMENTATION ET DÉMARRAGE ===
    {
      id: 'hibernate-on',
      title: 'Hibernation ON',
      description: 'Activer la mise en veille prolongée.',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.hibernate(true),
      actionText: 'Activer',
      actionIcon: Settings,
      category: 'Alimentation',
    },
    {
      id: 'hibernate-off',
      title: 'Hibernation OFF',
      description: 'Désactiver la mise en veille prolongée.',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.hibernate(false),
      actionText: 'Désactiver',
      actionIcon: Settings,
      category: 'Alimentation',
    },
    {
      id: 'fast-startup-on',
      title: 'Fast Startup ON',
      description: 'Activer le démarrage rapide Windows.',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.fastStartup(true),
      actionText: 'Activer',
      actionIcon: Settings,
      category: 'Alimentation',
    },
    {
      id: 'fast-startup-off',
      title: 'Fast Startup OFF',
      description: 'Désactiver le démarrage rapide Windows.',
      icon: Settings,
      status: 'available' as const,
      action: () => actions.fastStartup(false),
      actionText: 'Désactiver',
      actionIcon: Settings,
      category: 'Alimentation',
    },

    // === SYSTÈME AVANCÉ ===
    {
      id: 'reboot-now',
      title: 'Redémarrer',
      description: 'Redémarrer immédiatement le PC.',
      icon: Settings,
      status: 'available' as const,
      action: actions.reboot,
      actionText: 'Redémarrer',
      actionIcon: Settings,
      category: 'Système',
    },
    {
      id: 'shutdown-now',
      title: 'Éteindre',
      description: 'Éteindre immédiatement le PC.',
      icon: Settings,
      status: 'available' as const,
      action: actions.shutdown,
      actionText: 'Éteindre',
      actionIcon: Settings,
      category: 'Système',
    },
  ]

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
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Settings size={28} color="white" />
          </div>
          <div>
            <h1
              style={{
                fontSize: '36px',
                fontWeight: '800',
                margin: '0 0 8px 0',
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
              data-testid="godmode-title"
            >
              God Mode
            </h1>
            <p
              style={{
                fontSize: '16px',
                color: 'rgba(255, 255, 255, 0.7)',
                margin: 0,
              }}
            >
              Accès avancé aux paramètres système et outils d'administration
            </p>
          </div>
        </div>
      </motion.div>

      {/* Barre de recherche */}
      <div
        style={{
          ...surface.muted,
          padding: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 24,
        }}
      >
        <Search size={18} color="var(--text-muted)" />
        <input
          type="text"
          placeholder={t('search_placeholder')}
          aria-label={t('search_placeholder')}
          style={{ ...inputTokens.base, flex: 1 }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Grille des tuiles d'action organisées par catégories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {(() => {
          // Grouper les outils par catégorie
          const groupedTools = godModeTools.reduce(
            (acc, tool) => {
              const category = tool.category || 'Autres'
              if (!acc[category]) {
                acc[category] = []
              }
              acc[category].push(tool)
              return acc
            },
            {} as { [key: string]: typeof godModeTools },
          )

          return Object.entries(groupedTools).map(([category, tools]) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {/* En-tête de catégorie */}
              <div
                style={{
                  ...surface.muted,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Settings size={16} color="white" />
                </div>
                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#FFFFFF',
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {category}
                </h2>
                <div
                  style={{
                    flex: 1,
                    height: '1px',
                    background:
                      'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
                  }}
                />
                <span
                  style={{
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontWeight: '500',
                  }}
                >
                  {tools.length} outil{tools.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Grille des outils de cette catégorie */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '20px',
                }}
              >
                {tools.map((tool, index) => (
                  <UnifiedTile
                    key={tool.id}
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
            </motion.div>
          ))
        })()}
      </div>

      {/* Ajouts avancés */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
          gap: 16,
          marginTop: 16,
        }}
      >
        {/* BitLocker lecteurs */}
        <div style={{ ...surface.muted, padding: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <strong>BitLocker (lecteurs)</strong>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const st = await window.electronAPI.bitlockerStatus()
                setBlDrives(st || [])
              }}
            >
              {t('refresh') || 'Rafraîchir'}
            </Button>
          </div>
          <div style={{ display: 'grid', gap: 8, overflow: 'hidden' }}>
            {blDrives.length ? (
              blDrives.map((d) => (
                <div
                  key={d.letter}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 10,
                    gap: 8,
                    flexWrap: 'wrap',
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{d.letter}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {d.protection} • {d.status}
                      {typeof d.percent === 'number' ? ` • ${d.percent}%` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const r = await window.electronAPI.bitlockerEnableDrive(d.letter)
                        const ok = !!(r as any)?.ok || !!r
                        ok ? notify('Activation demandée') : notifyErr('Échec')
                        if (ok) log(`BitLocker ON ${d.letter}`)
                      }}
                    >
                      Activer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const r = await window.electronAPI.bitlockerDisableDrive(d.letter)
                        const ok = !!(r as any)?.ok || !!r
                        ok ? notify('Désactivation demandée') : notifyErr('Échec')
                        if (ok) log(`BitLocker OFF ${d.letter}`)
                      }}
                    >
                      Désactiver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const k = await window.electronAPI.bitlockerGetRecoveryKey(d.letter)
                        if (k) {
                          await navigator.clipboard.writeText(k)
                          notify('Clé copiée')
                          log(`Clé récup ${d.letter}`)
                        } else notifyErr('Clé introuvable')
                      }}
                    >
                      Clé
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const f = await window.electronAPI.bitlockerSaveRecoveryKey(d.letter)
                        if (f) {
                          notify('Clé enregistrée sur le Bureau')
                          log(`Clé enregistrée ${d.letter}`)
                        } else notifyErr('Échec enregistrement')
                      }}
                    >
                      Enregistrer
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {t('no_drives') || 'Aucun lecteur détecté'}
              </div>
            )}
          </div>
        </div>

        {/* Pause Windows Update (durée) */}
        <div style={{ ...surface.muted, padding: 16 }}>
          <strong>{t('wu_pause_planned') || 'Windows Update (pause planifiée)'}</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span>{t('duration') || 'Durée'}</span>
            <select
              value={wuPauseDays}
              onChange={(e) => setWuPauseDays(Number(e.target.value))}
              title="Durée"
              style={{ ...selectTokens.base }}
            >
              <option value={7}>7 jours</option>
              <option value={14}>14 jours</option>
              <option value={35}>35 jours</option>
            </select>
            <Button variant="primary" onClick={() => actions.windowsUpdatePauseDays?.()}>
              {t('schedule') || 'Planifier'}
            </Button>
          </div>
        </div>

        {/* Defender exclusions */}
        <div style={{ ...surface.muted, padding: 16 }}>
          <strong>Windows Defender (exclusions)</strong>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <input
              placeholder="Chemin à exclure (ex: C:\\MonDossier)"
              aria-label="Ajouter une exclusion Defender"
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const v = (e.target as HTMLInputElement).value.trim()
                  if (v) {
                    const r = await window.electronAPI.defenderAddExclusion(v)
                    const ok = !!(r as any)?.ok || !!r
                    ok ? notify('Exclusion ajoutée') : notifyErr('Échec')
                    if (ok) {
                      setDefExclusions((prev) => [...prev, v])
                      ;(e.target as HTMLInputElement).value = ''
                      log(`Defender exclu: ${v}`)
                    }
                  }
                }
              }}
              style={{ ...inputTokens.base, flex: 1, minWidth: 240 }}
            />
            <Button
              variant="outline"
              onClick={async () => {
                const ex = await window.electronAPI.defenderListExclusions()
                setDefExclusions((ex as any)?.ok ? (ex as any).data : ex || [])
              }}
            >
              {t('refresh') || 'Rafraîchir'}
            </Button>
          </div>
          <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            {defExclusions.length ? (
              defExclusions.map((p, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '6px 8px',
                  }}
                >
                  <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 12 }}>{p}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const r = await window.electronAPI.defenderRemoveExclusion(p)
                      const ok = !!(r as any)?.ok || !!r
                      ok ? notify('Exclusion supprimée') : notifyErr('Échec')
                      if (ok) {
                        setDefExclusions((prev) => prev.filter((x) => x !== p))
                        log(`Defender exclu retiré: ${p}`)
                      }
                    }}
                  >
                    Supprimer
                  </Button>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {t('no_exclusions') || 'Aucune exclusion'}
              </div>
            )}
          </div>
        </div>

        {/* Journal des actions */}
        <div style={{ ...surface.muted, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>{t('action_log') || 'Journal des actions'}</strong>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" variant="outline" onClick={() => setActionLog([])}>
                {t('clear') || 'Effacer'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    const p = (window as any).electronAPI?.godmodeGetLogFile
                      ? await (window as any).electronAPI.godmodeGetLogFile()
                      : null
                    if (p && typeof p === 'string') {
                      const dir = p.replace(/\\[^\\]*$/, '')
                      await (window as any).electronAPI.openFolder(dir)
                      return
                    }
                  } catch {}
                }}
              >
                {t('export') || 'Exporter'}
              </Button>
            </div>
          </div>
          <div
            style={{
              maxHeight: 200,
              overflow: 'auto',
              marginTop: 8,
              fontFamily: 'ui-monospace,monospace',
              fontSize: 12,
            }}
          >
            {actionLog.length
              ? actionLog.map((a, i) => (
                  <div key={i}>
                    [{new Date(a.ts).toLocaleString()}] {a.text}
                  </div>
                ))
              : 'Aucune action'}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(2px)',
          }}
          ref={overlayRef}
          onMouseDown={(e) => {
            if (e.target === overlayRef.current) closeModal()
          }}
        >
          <div
            style={{
              width: 'min(92vw, 560px)',
              background: 'rgba(18,18,18,0.98)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16,
              padding: 0,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div
              style={{
                height: 8,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                background: typeStyles[modalType].header,
              }}
            />
            <div style={{ padding: 24 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>
                {modalTitle}
              </h3>
              <p style={{ margin: '12px 0 16px 0', color: 'rgba(255,255,255,0.75)' }}>
                {modalMessage}
              </p>

              {modalOptions.length > 0 && (
                <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
                  {modalOptions.map((opt, i) => (
                    <Button
                      key={i}
                      onClick={async () => {
                        await opt.onClick()
                      }}
                      variant="outline"
                      style={{ justifyContent: 'flex-start' }}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              )}

              {showTextInput && (
                <input
                  value={textInputValue}
                  onChange={(e) => setTextInputValue(e.target.value)}
                  placeholder={'Description'}
                  aria-label="Description"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    outline: 'none',
                    marginBottom: 12,
                  }}
                />
              )}

              {dontShowKey && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: 14,
                  }}
                >
                  <input
                    aria-label="Ne plus afficher ce message"
                    type="checkbox"
                    checked={dontShowChecked}
                    onChange={(e) => setDontShowChecked(e.target.checked)}
                  />
                  Ne plus afficher ce message
                </label>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                <Button onClick={closeModal} disabled={isConfirming} variant="outline">
                  {modalCancelText}
                </Button>

                {modalOptions.length === 0 && (
                  <Button
                    onClick={async () => {
                      if (!onConfirm) return
                      setIsConfirming(true)
                      try {
                        if (dontShowKey && dontShowChecked) {
                          localStorage.setItem(`vwbox_modal_skip_${dontShowKey}`, '1')
                        }
                        await onConfirm()
                      } finally {
                        setIsConfirming(false)
                      }
                    }}
                    disabled={isConfirming}
                    variant="ghost"
                    style={{ background: typeStyles[modalType].button, border: 'none' }}
                  >
                    {modalConfirmText}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GodModePage
