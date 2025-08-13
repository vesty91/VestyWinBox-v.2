declare global {
  interface Window {
    electronAPI: {
      getAppPath(): Promise<string>
      getInstalledSoftware(): Promise<any[]>
      getPortableApps(): Promise<any[]>
      getPortableAppsPath(): Promise<string>
      chooseDirectory(options?: { title?: string; defaultPath?: string }): Promise<string | null>
      getPortableRootDir(): Promise<string | null>
      setPortableRootDir(dir: string): Promise<boolean>
      openPortableRoot(): Promise<boolean>
      getFileIconDataUrl(filePath: string): Promise<string | null>
      startPortableWatch(): Promise<boolean>
      onPortableChanged(handler: (msg: { dir: string }) => void): void
      findIconForName(name: string): Promise<string | null>
      installSoftware(softwareInfo: any): Promise<boolean>
      launchApplication(executablePath: string): Promise<boolean>
      launchApplicationWithCwd(executablePath: string, workingDirectory: string): Promise<boolean>
      launchApplicationElevated(executablePath: string): Promise<boolean>
      launchApplicationWithCwdElevated(
        executablePath: string,
        workingDirectory: string,
      ): Promise<boolean>
      uninstallSoftware(installPath: string): Promise<boolean>
      openFolder(folderPath: string): Promise<boolean>
      getSystemInfo(): Promise<any>
      getDiskSpace(): Promise<any>
      checkFileExists(filePath: string): Promise<boolean>
      killProcessByName(processName: string): Promise<boolean>
      isProcessRunning(processName: string): Promise<boolean>
      killQBitTorrentAggressive(): Promise<boolean>

      // Conversion / fichiers
      getDefaultOutputDir(): Promise<string | null>
      selectOutputDir(): Promise<string | null>
      selectFiles(options?: {
        filters?: { name: string; extensions: string[] }[]
        multi?: boolean
      }): Promise<{ path: string; name: string; size: number }[]>
      saveConvertedCopy(payload: {
        sourcePath: string
        outputDir: string
        newFileName: string
      }): Promise<string | null>
      importPortableExe(payload: {
        sourcePath: string
        targetName?: string
      }): Promise<string | null>
      launchPortable(payload: {
        exePath: string
        cwd?: string
        args?: string[]
        timeoutMs?: number
        env?: Record<string, string>
        elevated?: boolean
      }): Promise<boolean>
      onPortableLog(
        handler: (msg: { type: 'info' | 'warn' | 'error' | 'success'; message: string }) => void,
      ): void
      detectConverters(): Promise<{
        ffmpeg: boolean
        magick: boolean
        sevenZip: boolean
        libreoffice: boolean
        gs: boolean
      }>
      convertFiles(payload: {
        type: 'video' | 'audio' | 'image' | 'archive' | 'document'
        files: { path: string; name: string }[]
        outputFormat: string
        outputDir: string
        sessionId: string
        options?: {
          videoCrf?: number
          videoPreset?:
            | 'ultrafast'
            | 'superfast'
            | 'veryfast'
            | 'faster'
            | 'fast'
            | 'medium'
            | 'slow'
            | 'slower'
            | 'veryslow'
          audioBitrateK?: number
        }
      }): Promise<boolean>
      convertCancel(sessionId: string): Promise<boolean>
      convertPause(sessionId: string): Promise<boolean>
      convertResume(sessionId: string): Promise<boolean>
      convertSkip(sessionId: string): Promise<boolean>
      onConvertProgress(
        handler: (msg: { sessionId: string; file?: string; line: string }) => void,
      ): void
      onConvertFileDone(
        handler: (msg: {
          sessionId: string
          file: string
          success: boolean
          output?: string | null
          error?: string
        }) => void,
      ): void
      onConvertSessionDone(handler: (msg: { sessionId: string; done: boolean }) => void): void
      offConvertProgress(handler: any): void
      offConvertFileDone(handler: any): void
      offConvertSessionDone(handler: any): void

      // Analytics
      getRealtimeAnalytics(): Promise<{
        cpu: number
        memory: number
        disk: number
        networkKbps: number
      }>

      // GodMode
      checkSecureBootStatus(): Promise<boolean | null>
      rebootToUEFI(): Promise<boolean>
      setUACEnabled(enabled: boolean): Promise<boolean>
      createRestorePoint(description?: string): Promise<boolean>
      generateBatteryReport(): Promise<string | null>
      runSystemHealthScan(): Promise<boolean>
      setUltimatePerformancePlan(): Promise<boolean>
      cleanTempFiles(): Promise<boolean>

      // Extra GodMode
      setShowHiddenFiles(enable: boolean): Promise<boolean>
      setShowFileExtensions(enable: boolean): Promise<boolean>
      flushDNS(): Promise<boolean>
      openDeviceManager(): Promise<boolean>
      openDiskManagement(): Promise<boolean>
      openServices(): Promise<boolean>
      openRegistryEditor(): Promise<boolean>
      openEventViewer(): Promise<boolean>
      openTaskScheduler(): Promise<boolean>
      openComputerManagement(): Promise<boolean>
      openPerformanceMonitor(): Promise<boolean>
      openSystemInfo(): Promise<boolean>
      openProgramsAndFeatures(): Promise<boolean>
      openWindowsFeatures(): Promise<boolean>
      openNetworkConnections(): Promise<boolean>
      openFirewallControl(): Promise<boolean>
      openGroupPolicy(): Promise<boolean>
      openLocalSecurityPolicy(): Promise<boolean>
      openSystemPropertiesAdvanced(): Promise<boolean>
      openEnvironmentVariablesDialog(): Promise<boolean>
      restartExplorer(): Promise<boolean>
      openWindowsGodModeFolder(): Promise<boolean>
      setFirewallEnabled(enable: boolean): Promise<boolean>
      setDarkMode(dark: boolean): Promise<boolean>
      setDefenderRealtime(enable: boolean): Promise<boolean>
      setWindowsUpdatePaused(pause: boolean): Promise<boolean>
      setBitLockerEnabled(enable: boolean): Promise<boolean>
      bitlockerStatus(): Promise<
        { letter: string; protection: string; status: string; percent: number | null }[]
      >
      bitlockerEnableDrive(drive: string): Promise<boolean>
      bitlockerDisableDrive(drive: string): Promise<boolean>
      bitlockerGetRecoveryKey(drive: string): Promise<string>
      bitlockerSaveRecoveryKey(drive: string): Promise<string | null>
      windowsUpdatePauseDays(days: number): Promise<boolean>
      defenderListExclusions(): Promise<string[]>
      defenderAddExclusion(p: string): Promise<boolean>
      defenderRemoveExclusion(p: string): Promise<boolean>

      // Chocolatey
      chocoIsAvailable(): Promise<boolean>
      installChocolatey(): Promise<boolean>
      chocoListLocal(): Promise<{ name: string; version: string }[]>
      chocoSearch(query: string): Promise<{ name: string; version: string }[]>
      chocoInstall(name: string): Promise<boolean>
      chocoUpgrade(name: string): Promise<boolean>
      chocoUninstall(name: string): Promise<boolean>
      chocoOutdated(): Promise<{ name: string; current: string; available: string }[]>
      chocoInfo(name: string): Promise<string>
      chocoRun(args: string[], sessionId: string): Promise<boolean>
      chocoCancel(sessionId: string): Promise<boolean>
      chocoRunElevated(args: string[], sessionId: string): Promise<boolean>
      onChocoLog(
        handler: (msg: { sessionId: string; type: 'stdout' | 'stderr'; data: string }) => void,
      ): void
      onChocoExit(handler: (msg: { sessionId: string; code: number }) => void): void
      offChocoLog(handler: any): void
      offChocoExit(handler: any): void
      chocoListVersions?: (name: string) => Promise<string[]>

      // GodMode+ additions
      resetNetworkStack(): Promise<boolean>
      clearWindowsUpdateCache(): Promise<boolean>
      setHibernateEnabled(enable: boolean): Promise<boolean>
      emptyRecycleBin(): Promise<boolean>
      openWindowsUpdateSettings(): Promise<boolean>
      rebootNow(): Promise<boolean>
      shutdownNow(): Promise<boolean>
      openStartupFolder(): Promise<boolean>
      setFastStartup(enable: boolean): Promise<boolean>
      setRemoteDesktop(enable: boolean): Promise<boolean>

      // Auto‑update
      updateCheck(): Promise<import('../types/result').Result<boolean>>
      updateDownload(): Promise<import('../types/result').Result<boolean>>
      updateInstallNow(): Promise<import('../types/result').Result<boolean>>
      onUpdateChecking(handler: () => void): void
      onUpdateAvailable(handler: (info: any) => void): void
      onUpdateNone(handler: (info: any) => void): void
      onUpdateError(handler: (err: any) => void): void
      onUpdateProgress(handler: (p: any) => void): void
      onUpdateDownloaded(handler: (info: any) => void): void
      offUpdate(channel: string, handler: any): void

      platform: string
      arch: string
      version: string
      sendCommand(channel: string, ...args: any[]): Promise<any>
      invokeResult<T = any>(
        channel: string,
        ...args: any[]
      ): Promise<import('../types/result').Result<T>>
    }
  }
}

export {}
