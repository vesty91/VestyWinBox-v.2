const { contextBridge, ipcRenderer } = require('electron')

// Exposer les APIs Electron de manière sécurisée
contextBridge.exposeInMainWorld('electronAPI', {
  getAppPath: () => ipcRenderer.invoke('getAppPath'),
  getInstalledSoftware: () => ipcRenderer.invoke('getInstalledSoftware'),
  getPortableApps: () => ipcRenderer.invoke('getPortableApps'),
  getPortableAppsPath: () => ipcRenderer.invoke('getPortableAppsPath'),
  chooseDirectory: (options) => ipcRenderer.invoke('chooseDirectory', options),
  getPortableRootDir: () => ipcRenderer.invoke('getPortableRootDir'),
  setPortableRootDir: (dir) => ipcRenderer.invoke('setPortableRootDir', dir),
  openPortableRoot: () => ipcRenderer.invoke('openPortableRoot'),
  getFileIconDataUrl: (filePath) => ipcRenderer.invoke('getFileIconDataUrl', filePath),
  startPortableWatch: () => ipcRenderer.invoke('startPortableWatch'),
  onPortableChanged: (handler) => ipcRenderer.on('portable:changed', (_e, msg) => handler(msg)),
  portableGetLogFile: () =>
    ipcRenderer.invoke('portableGetLogFile').then((r) => (r && r.ok ? r.data : null)),
  godmodeGetLogFile: () =>
    ipcRenderer.invoke('godmodeGetLogFile').then((r) => (r && r.ok ? r.data : null)),
  findIconForName: (name) => ipcRenderer.invoke('findIconForName', name),
  installSoftware: (softwareInfo) => ipcRenderer.invoke('installSoftware', softwareInfo),
  launchApplication: (executablePath) => ipcRenderer.invoke('launchApplication', executablePath),
  launchApplicationWithCwd: (executablePath, workingDirectory) =>
    ipcRenderer.invoke('launchApplicationWithCwd', executablePath, workingDirectory),
  launchApplicationElevated: (executablePath) =>
    ipcRenderer.invoke('launchApplicationElevated', executablePath),
  launchApplicationWithCwdElevated: (executablePath, workingDirectory) =>
    ipcRenderer.invoke('launchApplicationWithCwdElevated', executablePath, workingDirectory),
  uninstallSoftware: (installPath) => ipcRenderer.invoke('uninstallSoftware', installPath),
  openFolder: (folderPath) => ipcRenderer.invoke('openFolder', folderPath),
  getSystemInfo: () => ipcRenderer.invoke('getSystemInfo'),
  getDiskSpace: () => ipcRenderer.invoke('getDiskSpace'),
  checkFileExists: (filePath) => ipcRenderer.invoke('checkFileExists', filePath),
  killProcessByName: (processName) => ipcRenderer.invoke('killProcessByName', processName),
  isProcessRunning: (processName) => ipcRenderer.invoke('isProcessRunning', processName),
  killQBitTorrentAggressive: () => ipcRenderer.invoke('killQBitTorrentAggressive'),

  // Conversion / fichiers
  getDefaultOutputDir: async () => {
    const res = await ipcRenderer.invoke('getDefaultOutputDir')
    return res && typeof res === 'object' && 'ok' in res ? (res.ok ? res.data : null) : res
  },
  selectOutputDir: () => ipcRenderer.invoke('selectOutputDir'),
  selectFiles: async (options) => {
    const res = await ipcRenderer.invoke('selectFiles', options)
    return res && typeof res === 'object' && 'ok' in res ? (res.ok ? res.data : []) : res
  },
  saveConvertedCopy: async (payload) => {
    const res = await ipcRenderer.invoke('saveConvertedCopy', payload)
    return res && typeof res === 'object' && 'ok' in res ? (res.ok ? res.data : null) : res
  },
  importPortableExe: (payload) => ipcRenderer.invoke('importPortableExe', payload),
  launchPortable: (payload) => ipcRenderer.invoke('launchPortable', payload),
  onPortableLog: (handler) => ipcRenderer.on('portable:log', (_e, msg) => handler(msg)),
  detectConverters: async () => {
    const res = await ipcRenderer.invoke('detectConverters')
    return res && typeof res === 'object' && 'ok' in res
      ? res.ok
        ? res.data
        : { ffmpeg: false, magick: false, sevenZip: false, libreoffice: false, gs: false }
      : res
  },
  convertFiles: (payload) => ipcRenderer.invoke('convertFiles', payload),
  convertCancel: (sessionId) => ipcRenderer.invoke('convertCancel', sessionId),
  convertPause: (sessionId) => ipcRenderer.invoke('convertPause', sessionId),
  convertResume: (sessionId) => ipcRenderer.invoke('convertResume', sessionId),
  convertSkip: (sessionId) => ipcRenderer.invoke('convertSkip', sessionId),
  onConvertProgress: (handler) => ipcRenderer.on('convert:progress', (_e, msg) => handler(msg)),
  onConvertFileDone: (handler) => ipcRenderer.on('convert:fileDone', (_e, msg) => handler(msg)),
  onConvertSessionDone: (handler) =>
    ipcRenderer.on('convert:sessionDone', (_e, msg) => handler(msg)),
  offConvertProgress: (handler) => ipcRenderer.removeListener('convert:progress', handler),
  offConvertFileDone: (handler) => ipcRenderer.removeListener('convert:fileDone', handler),
  offConvertSessionDone: (handler) => ipcRenderer.removeListener('convert:sessionDone', handler),
  convertGetLogFile: (sessionId) =>
    ipcRenderer.invoke('convertGetLogFile', sessionId).then((r) => (r && r.ok ? r.data : null)),

  // Analytics
  getRealtimeAnalytics: () => ipcRenderer.invoke('getRealtimeAnalytics'),

  // GodMode APIs
  checkSecureBootStatus: () => ipcRenderer.invoke('checkSecureBootStatus'),
  rebootToUEFI: () => ipcRenderer.invoke('rebootToUEFI'),
  setUACEnabled: (enabled) => ipcRenderer.invoke('setUACEnabled', enabled),
  createRestorePoint: (description) => ipcRenderer.invoke('createRestorePoint', description),
  generateBatteryReport: () => ipcRenderer.invoke('generateBatteryReport'),
  runSystemHealthScan: () => ipcRenderer.invoke('runSystemHealthScan'),
  setUltimatePerformancePlan: () => ipcRenderer.invoke('setUltimatePerformancePlan'),
  cleanTempFiles: () => ipcRenderer.invoke('cleanTempFiles'),

  // Extra GodMode
  setShowHiddenFiles: (enable) => ipcRenderer.invoke('setShowHiddenFiles', enable),
  setShowFileExtensions: (enable) => ipcRenderer.invoke('setShowFileExtensions', enable),
  flushDNS: () => ipcRenderer.invoke('flushDNS'),
  openDeviceManager: () => ipcRenderer.invoke('openDeviceManager'),
  openDiskManagement: () => ipcRenderer.invoke('openDiskManagement'),
  openServices: () => ipcRenderer.invoke('openServices'),
  openRegistryEditor: () => ipcRenderer.invoke('openRegistryEditor'),
  openEventViewer: () => ipcRenderer.invoke('openEventViewer'),
  openTaskScheduler: () => ipcRenderer.invoke('openTaskScheduler'),
  openComputerManagement: () => ipcRenderer.invoke('openComputerManagement'),
  openPerformanceMonitor: () => ipcRenderer.invoke('openPerformanceMonitor'),
  openSystemInfo: () => ipcRenderer.invoke('openSystemInfo'),
  openProgramsAndFeatures: () => ipcRenderer.invoke('openProgramsAndFeatures'),
  openWindowsFeatures: () => ipcRenderer.invoke('openWindowsFeatures'),
  openNetworkConnections: () => ipcRenderer.invoke('openNetworkConnections'),
  openFirewallControl: () => ipcRenderer.invoke('openFirewallControl'),
  openGroupPolicy: () => ipcRenderer.invoke('openGroupPolicy'),
  openLocalSecurityPolicy: () => ipcRenderer.invoke('openLocalSecurityPolicy'),
  openSystemPropertiesAdvanced: () => ipcRenderer.invoke('openSystemPropertiesAdvanced'),
  openEnvironmentVariablesDialog: () => ipcRenderer.invoke('openEnvironmentVariablesDialog'),
  restartExplorer: () => ipcRenderer.invoke('restartExplorer'),
  openWindowsGodModeFolder: () => ipcRenderer.invoke('openWindowsGodModeFolder'),
  setFirewallEnabled: (enable) => ipcRenderer.invoke('setFirewallEnabled', enable),
  setDarkMode: (dark) => ipcRenderer.invoke('setDarkMode', dark),
  setDefenderRealtime: (enable) => ipcRenderer.invoke('setDefenderRealtime', enable),
  setWindowsUpdatePaused: (pause) => ipcRenderer.invoke('setWindowsUpdatePaused', pause),
  setBitLockerEnabled: (enable) => ipcRenderer.invoke('setBitLockerEnabled', enable),
  bitlockerStatus: () => ipcRenderer.invoke('bitlockerStatus'),
  bitlockerEnableDrive: (drive) => ipcRenderer.invoke('bitlockerEnableDrive', drive),
  bitlockerDisableDrive: (drive) => ipcRenderer.invoke('bitlockerDisableDrive', drive),
  bitlockerGetRecoveryKey: (drive) => ipcRenderer.invoke('bitlockerGetRecoveryKey', drive),
  bitlockerSaveRecoveryKey: (drive) => ipcRenderer.invoke('bitlockerSaveRecoveryKey', drive),
  windowsUpdatePauseDays: (days) => ipcRenderer.invoke('windowsUpdatePauseDays', days),
  defenderListExclusions: () => ipcRenderer.invoke('defenderListExclusions'),
  defenderAddExclusion: (p) => ipcRenderer.invoke('defenderAddExclusion', p),
  defenderRemoveExclusion: (p) => ipcRenderer.invoke('defenderRemoveExclusion', p),

  // Chocolatey
  chocoIsAvailable: () => ipcRenderer.invoke('chocoIsAvailable'),
  installChocolatey: async () => {
    const res = await ipcRenderer.invoke('installChocolatey')
    if (res && typeof res === 'object' && 'ok' in res) return !!res.ok
    return !!res
  },
  chocoListLocal: async () => {
    const res = await ipcRenderer.invoke('chocoListLocal')
    return res && typeof res === 'object' && 'ok' in res ? (res.ok ? res.data : []) : res
  },
  chocoSearch: async (query) => {
    const res = await ipcRenderer.invoke('chocoSearch', query)
    if (res && typeof res === 'object' && 'ok' in res) return res.ok ? res.data : []
    return res
  },
  chocoInstall: (name) => ipcRenderer.invoke('chocoInstall', name),
  chocoUpgrade: (name) => ipcRenderer.invoke('chocoUpgrade', name),
  chocoUninstall: (name) => ipcRenderer.invoke('chocoUninstall', name),
  chocoOutdated: async () => {
    const res = await ipcRenderer.invoke('chocoOutdated')
    if (res && typeof res === 'object' && 'ok' in res) return res.ok ? res.data : []
    return res
  },
  chocoInfo: async (name) => {
    const res = await ipcRenderer.invoke('chocoInfo', name)
    return res && typeof res === 'object' && 'ok' in res ? (res.ok ? res.data : '') : res
  },
  chocoListVersions: async (name) => {
    const res = await ipcRenderer.invoke('chocoListVersions', name)
    return res && typeof res === 'object' && 'ok' in res ? (res.ok ? res.data : []) : res
  },
  chocoRun: (args, sessionId) => ipcRenderer.invoke('chocoRun', { args, sessionId }),
  chocoCancel: (sessionId) => ipcRenderer.invoke('chocoCancel', sessionId),
  chocoRunElevated: (args, sessionId) =>
    ipcRenderer.invoke('chocoRunElevated', { args, sessionId }),
  onChocoLog: (handler) => ipcRenderer.on('choco:log', (_e, msg) => handler(msg)),
  onChocoExit: (handler) => ipcRenderer.on('choco:exit', (_e, msg) => handler(msg)),
  offChocoLog: (handler) => ipcRenderer.removeListener('choco:log', handler),
  offChocoExit: (handler) => ipcRenderer.removeListener('choco:exit', handler),

  // GodMode+
  resetNetworkStack: () => ipcRenderer.invoke('resetNetworkStack'),
  clearWindowsUpdateCache: () => ipcRenderer.invoke('clearWindowsUpdateCache'),
  setHibernateEnabled: (enable) => ipcRenderer.invoke('setHibernateEnabled', enable),
  emptyRecycleBin: () => ipcRenderer.invoke('emptyRecycleBin'),
  openWindowsUpdateSettings: () => ipcRenderer.invoke('openWindowsUpdateSettings'),
  rebootNow: () => ipcRenderer.invoke('rebootNow'),
  shutdownNow: () => ipcRenderer.invoke('shutdownNow'),
  openStartupFolder: () => ipcRenderer.invoke('openStartupFolder'),
  setFastStartup: (enable) => ipcRenderer.invoke('setFastStartup', enable),
  setRemoteDesktop: (enable) => ipcRenderer.invoke('setRemoteDesktop', enable),

  // Auto‑update
  updateCheck: () => ipcRenderer.invoke('updateCheck'),
  updateDownload: () => ipcRenderer.invoke('updateDownload'),
  updateInstallNow: () => ipcRenderer.invoke('updateInstallNow'),
  onUpdateChecking: (h) => ipcRenderer.on('update:checking', h),
  onUpdateAvailable: (h) => ipcRenderer.on('update:available', (_e, info) => h(info)),
  onUpdateNone: (h) => ipcRenderer.on('update:none', (_e, info) => h(info)),
  onUpdateError: (h) => ipcRenderer.on('update:error', (_e, err) => h(err)),
  onUpdateProgress: (h) => ipcRenderer.on('update:progress', (_e, p) => h(p)),
  onUpdateDownloaded: (h) => ipcRenderer.on('update:downloaded', (_e, info) => h(info)),
  offUpdate: (channel, h) => ipcRenderer.removeListener(channel, h),

  platform: process.platform,
  arch: process.arch,
  version: process.versions.electron,
  // util generic
  sendCommand: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  invokeResult: async (channel, ...args) => {
    try {
      const res = await ipcRenderer.invoke(channel, ...args)
      if (res && typeof res === 'object' && 'ok' in res) return res
      if (res === false) return { ok: false, message: 'Operation failed' }
      return { ok: true, data: res }
    } catch (e) {
      return { ok: false, message: String(e) }
    }
  },
  chocoGetLogFile: (sessionId) =>
    ipcRenderer.invoke('chocoGetLogFile', sessionId).then((r) => (r && r.ok ? r.data : null)),

  // === API réseau Electron (bypass CORS) ===
  fetch: async (url, options = {}) => {
    try {
      const response = await ipcRenderer.invoke('electronFetch', url, options)

      // Ajouter les méthodes text() et json() qui manquent
      response.text = () => Promise.resolve(response._textData)
      response.json = () => {
        try {
          return Promise.resolve(JSON.parse(response._textData))
        } catch (e) {
          return Promise.reject(new Error(`Invalid JSON: ${e.message}`))
        }
      }

      return response
    } catch (error) {
      throw new Error(`Electron fetch error: ${error.message}`)
    }
  },

  // === API téléchargement Electron ===
  downloadFile: async (url, fileName) => {
    try {
      const result = await ipcRenderer.invoke('downloadFile', url, fileName)
      return result
    } catch (error) {
      throw new Error(`Download error: ${error.message}`)
    }
  },

  // === API shell Electron ===
  shell: {
    openExternal: (url) => ipcRenderer.invoke('openExternal', url),
  },

  // === API fenêtre web Electron ===
  openWebWindow: async (url) => {
    try {
      const result = await ipcRenderer.invoke('openWebWindow', url)
      return result
    } catch (error) {
      throw new Error(`Web window error: ${error.message}`)
    }
  },
})

// Gestion des erreurs
window.addEventListener('error', (event) => {
  console.error('Erreur dans le processus de rendu:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promesse rejetée non gérée dans le processus de rendu:', event.reason)
})
