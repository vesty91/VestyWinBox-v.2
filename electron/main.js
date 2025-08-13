const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { exec, spawn } = require('child_process')
const os = require('os')
const { execSync } = require('child_process')
let autoUpdater = null
try {
  autoUpdater = require('electron-updater').autoUpdater
} catch {}

// Garder une référence globale de l'objet window
let mainWindow

function createWindow() {
  // Créer la fenêtre du navigateur
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
      // Désactiver le cache pour éviter les problèmes
      partition: 'persist:main',
    },
    icon: path.join(__dirname, '../assets/icon.ico'),
    titleBarStyle: 'default',
    show: false,
    backgroundColor: '#0f0f0f',
  })

  // Nettoyer le cache au démarrage
  mainWindow.webContents.session.clearCache()
  mainWindow.webContents.session.clearStorageData()

  // Définir la Content Security Policy (plus stricte en prod)
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const cspDev =
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:;"
    const cspProd =
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:;"
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [isDev ? cspDev : cspProd],
      },
    })
  })

  // Charger l'application
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production'

  if (isDev) {
    // Attendre que le serveur soit prêt
    const loadDevServer = async () => {
      try {
        console.log('Tentative de connexion au serveur de développement...')
        await mainWindow.loadURL('http://localhost:5173')
        console.log('Connexion réussie au serveur de développement')
        mainWindow.webContents.openDevTools()
      } catch (error) {
        console.error('Erreur de connexion au serveur de développement:', error)
        // Afficher une page de fallback
        mainWindow.loadURL(
          'data:text/html,<html><body style="background:#0f0f0f;color:#fff;font-family:Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h1>VestyWinBox</h1><p>Connexion au serveur de développement...</p><p>Vérifiez que le serveur Vite est en cours d\'exécution sur le port 5173</p></div></body></html>',
        )
        // Essayer de recharger après un délai
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            loadDevServer()
          }
        }, 2000)
      }
    }

    loadDevServer()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Afficher la fenêtre quand elle est prête
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()

    if (isDev) {
      // Animation d'entrée simple uniquement en dev
      mainWindow.setOpacity(0)
      let opacity = 0
      const fadeIn = setInterval(() => {
        opacity += 0.1
        mainWindow.setOpacity(opacity)
        if (opacity >= 1) {
          clearInterval(fadeIn)
        }
      }, 30)
    } else {
      // Vérifier les mises à jour en prod (best-effort)
      try {
        if (autoUpdater) {
          autoUpdater.autoDownload = false
          autoUpdater.checkForUpdates().catch(() => {})
        }
      } catch {}
    }
  })

  // Brancher les événements d'auto‑update et relayer au renderer
  try {
    if (autoUpdater) {
      autoUpdater.on('checking-for-update', () => {
        try {
          mainWindow?.webContents.send('update:checking')
        } catch {}
      })
      autoUpdater.on('update-available', (info) => {
        try {
          mainWindow?.webContents.send('update:available', info)
        } catch {}
      })
      autoUpdater.on('update-not-available', (info) => {
        try {
          mainWindow?.webContents.send('update:none', info)
        } catch {}
      })
      autoUpdater.on('error', (err) => {
        try {
          mainWindow?.webContents.send('update:error', String(err))
        } catch {}
      })
      autoUpdater.on('download-progress', (p) => {
        try {
          mainWindow?.webContents.send('update:progress', p)
        } catch {}
      })
      autoUpdater.on('update-downloaded', (info) => {
        try {
          mainWindow?.webContents.send('update:downloaded', info)
        } catch {}
      })
    }
  } catch {}

  // Gérer la fermeture de la fenêtre
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Empêcher la navigation vers des URLs externes
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)

    if (!isDev && parsedUrl.protocol !== 'file:') {
      event.preventDefault()
      shell.openExternal(navigationUrl)
    }
  })

  // Gérer les erreurs de chargement
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Erreur de chargement:', errorCode, errorDescription, validatedURL)
    // Recharger après un délai en cas d'erreur
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('Tentative de rechargement...')
        mainWindow.reload()
      }
    }, 2000)
  })

  // Gérer les erreurs de crash
  mainWindow.webContents.on('crashed', (event) => {
    console.error('Processus de rendu crashé')
    // Recréer la fenêtre en cas de crash
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.reload()
      }
    }, 1000)
  })

  // Gérer les erreurs non capturées
  mainWindow.webContents.on('unresponsive', () => {
    console.error('Processus de rendu non responsive')
    // Recréer la fenêtre
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.reload()
      }
    }, 1000)
  })
}

// Fonction pour obtenir le chemin des apps portables après unpacking ASAR
function getPortableAppsPath() {
  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    // En développement, utiliser le chemin normal
    return path.join(__dirname, '../assets/Apps portable')
  } else {
    // En production, après unpacking ASAR
    return path.join(process.resourcesPath, 'app.asar.unpacked/assets/Apps portable')
  }
}

// Cette méthode sera appelée quand Electron aura fini l'initialisation
app.whenReady().then(createWindow)

// Quitter quand toutes les fenêtres sont fermées
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// APIs IPC pour la communication avec le renderer
ipcMain.handle('getAppPath', () => {
  return app.getAppPath()
})

ipcMain.handle('getInstalledSoftware', async () => {
  try {
    // Simulation de la détection des logiciels installés
    const commonPaths = [
      'C:\\Program Files',
      'C:\\Program Files (x86)',
      `${os.homedir()}\\AppData\\Local\\Programs`,
    ]

    const installedSoftware = []

    for (const basePath of commonPaths) {
      if (fs.existsSync(basePath)) {
        const programs = fs.readdirSync(basePath, { withFileTypes: true })

        for (const program of programs) {
          if (program.isDirectory()) {
            const programPath = path.join(basePath, program.name)
            const exeFiles = findExeFiles(programPath)

            if (exeFiles.length > 0) {
              installedSoftware.push({
                name: program.name,
                path: exeFiles[0],
                version: await getFileVersion(exeFiles[0]),
              })
            }
          }
        }
      }
    }

    return installedSoftware
  } catch (error) {
    console.error('Erreur lors de la détection des logiciels:', error)
    return []
  }
})

ipcMain.handle('getPortableApps', async () => {
  try {
    const configured = __loadPortableRoot()
    const defaults = ['C:\\PortableApps', `${os.homedir()}\\PortableApps`, 'D:\\PortableApps']
    const assetsPortable = getPortableAppsPath()
    const portablePaths = [...(configured ? [configured] : []), assetsPortable, ...defaults].filter(
      Boolean,
    )

    const portableApps = []

    for (const basePath of portablePaths) {
      if (fs.existsSync(basePath)) {
        const apps = fs.readdirSync(basePath, { withFileTypes: true })

        for (const app of apps) {
          if (app.isDirectory()) {
            const appPath = path.join(basePath, app.name)
            const exeFiles = findExeFiles(appPath)

            if (exeFiles.length > 0) {
              portableApps.push({
                name: app.name,
                path: exeFiles[0],
              })
            }
          }
        }
      }
    }

    return portableApps
  } catch (error) {
    console.error('Erreur lors de la détection des apps portables:', error)
    return []
  }
})

ipcMain.handle('installSoftware', async (event, softwareInfo) => {
  try {
    const { url, name, version } = softwareInfo

    // Simulation d'installation
    console.log(`Installation de ${name} depuis ${url}`)

    // Ici, vous pourriez implémenter la vraie logique d'installation
    // Par exemple, télécharger le fichier et l'exécuter

    // Simulation d'un délai d'installation
    await new Promise((resolve) => setTimeout(resolve, 2000))

    return true
  } catch (error) {
    console.error("Erreur lors de l'installation:", error)
    return false
  }
})

ipcMain.handle('checkFileExists', async (event, filePath) => {
  try {
    return fs.existsSync(filePath)
  } catch (error) {
    console.error('Erreur lors de la vérification du fichier:', error)
    return false
  }
})

ipcMain.handle('killProcessByName', async (event, processName) => {
  try {
    return new Promise((resolve) => {
      const safeName = sanitizeProcessName(processName)
      if (!safeName) return resolve(false)
      let command
      if (os.platform() === 'win32') {
        // Commande Windows plus simple et efficace
        command = `taskkill /f /im "${safeName}"`
      } else {
        command = `pkill -f "${safeName}" || pkill -9 -f "${safeName}" || true`
      }

      console.log(`Exécution de la commande: ${command}`)

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.log(`Erreur lors de la fermeture de ${processName}:`, error.message)
          // Ne pas rejeter l'erreur, car le processus peut ne pas exister
        } else {
          console.log(`Processus ${processName} fermé avec succès`)
        }
        // Toujours résoudre comme succès
        resolve(true)
      })
    })
  } catch (error) {
    console.error('Erreur lors de la fermeture du processus:', error)
    return false
  }
})

ipcMain.handle('launchApplication', async (event, executablePath) => {
  try {
    console.log(`Tentative de lancement: ${executablePath}`)

    if (!fs.existsSync(executablePath)) {
      console.error(`Fichier introuvable: ${executablePath}`)
      throw new Error('Fichier exécutable introuvable')
    }

    // Obtenir le répertoire de travail de l'exécutable
    const workingDir = path.dirname(executablePath)
    console.log(`Répertoire de travail: ${workingDir}`)

    // Lancer l'application avec le bon répertoire de travail
    const child = spawn(executablePath, [], {
      cwd: workingDir,
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        PATH: `${workingDir};${process.env.PATH}`,
      },
    })

    console.log(`Processus créé avec PID: ${child.pid}`)

    // Attendre un peu pour voir si l'application se lance
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Vérifier si le processus est toujours en cours
    if (child.pid) {
      console.log(`Processus lancé avec PID: ${child.pid}`)
      return true
    } else {
      console.log(`Application lancée mais processus terminé rapidement`)
      return true // Considérer comme succès même si l'app se ferme
    }
  } catch (error) {
    console.error('Erreur lors du lancement:', error)
    return false
  }
})

// Lancement portable avec options
ipcMain.handle('launchPortable', async (event, payload) => {
  try {
    const { exePath, cwd, args, timeoutMs, env, elevated } = payload || {}
    const normalize = (p) =>
      typeof p === 'string' ? p.replace(/"/g, '').replace(/\|\//g, (m) => m) : ''
    const isSafePath = (p) => typeof p === 'string' && p.length <= 520 && !/[<>|?*]/.test(p)
    const safeExe = normalize(exePath)
    const safeCwd = cwd ? normalize(cwd) : undefined
    if (!exePath || !fs.existsSync(exePath)) {
      try {
        event.sender.send('portable:log', {
          type: 'error',
          message: `Fichier introuvable: ${exePath}`,
        })
      } catch {}
      return false
    }
    const workDir = safeCwd && fs.existsSync(safeCwd) ? safeCwd : path.dirname(safeExe)
    const waitMs = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : 1500
    // Sanitize args: tableau de chaînes raisonnables, longueur max
    const safeArgs = (Array.isArray(args) ? args : [])
      .filter((a) => typeof a === 'string' && a.length <= 512)
      .map((a) => a.replace(/[\r\n]/g, ' ').trim())
    if (elevated) {
      // Démarrer élevé via PowerShell
      const argStr = safeArgs.length
        ? safeArgs
            .map((a) => a.replace(/"/g, '\\"'))
            .map((a) => `"${a}"`)
            .join(' ')
        : ''
      const ps = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '${safeExe.replace(/'/g, "''")}' -WorkingDirectory '${workDir.replace(/'/g, "''")}' -ArgumentList '${argStr.replace(/'/g, "''")}' -Verb RunAs"`
      exec(ps)
      try {
        event.sender.send('portable:log', {
          type: 'info',
          message: `Lancement (admin): ${safeExe} ${argStr}`,
        })
      } catch {}
      return true
    }
    try {
      event.sender.send('portable:log', {
        type: 'info',
        message: `Lancement: ${safeExe} (cwd=${workDir})`,
      })
    } catch {}
    const child = spawn(safeExe, safeArgs, {
      cwd: workDir,
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, ...(env || {}), PATH: `${workDir};${process.env.PATH}` },
    })
    const pid = child.pid
    try {
      event.sender.send('portable:log', { type: 'info', message: `PID: ${pid}` })
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, waitMs))
    // Si le process n'a pas encore de code de sortie, considérer succès
    const ok = child.exitCode === null || typeof child.exitCode === 'undefined'
    try {
      event.sender.send('portable:log', {
        type: ok ? 'success' : 'warn',
        message: ok ? 'Process démarré' : "Le processus s'est arrêté tôt",
      })
    } catch {}
    return true
  } catch (e) {
    console.error('launchPortable error:', e)
    try {
      event.sender.send('portable:log', { type: 'error', message: String(e) })
    } catch {}
    return false
  }
})

ipcMain.handle('uninstallSoftware', async (event, installPath) => {
  try {
    console.log(`Désinstallation depuis ${installPath}`)

    // Simulation de désinstallation
    await new Promise((resolve) => setTimeout(resolve, 1500))

    return true
  } catch (error) {
    console.error('Erreur lors de la désinstallation:', error)
    return false
  }
})

ipcMain.handle('openFolder', async (event, folderPath) => {
  try {
    if (!fs.existsSync(folderPath)) {
      throw new Error('Dossier introuvable')
    }

    shell.openPath(folderPath)
    return true
  } catch (error) {
    console.error("Erreur lors de l'ouverture du dossier:", error)
    return false
  }
})

ipcMain.handle('getSystemInfo', async () => {
  try {
    const platform = os.platform()
    const arch = os.arch()
    const version = os.version()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const cpus = os.cpus()

    return {
      platform,
      arch,
      version,
      totalMemory: Math.round((totalMem / 1024 / 1024 / 1024) * 100) / 100,
      freeMemory: Math.round((freeMem / 1024 / 1024 / 1024) * 100) / 100,
      cpuCount: cpus.length,
      cpuModel: cpus[0]?.model || 'Unknown',
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des infos système:', error)
    return null
  }
})

ipcMain.handle('getDiskSpace', async () => {
  try {
    const drives = ['C:', 'D:', 'E:', 'F:']
    const diskInfo = []

    for (const drive of drives) {
      try {
        const stats = fs.statSync(drive + '\\')
        diskInfo.push({
          drive,
          total: stats.size,
          free: stats.size, // Simplification
        })
      } catch (error) {
        // Drive non accessible
      }
    }

    return diskInfo
  } catch (error) {
    console.error('Erreur lors de la récupération des infos disque:', error)
    return null
  }
})

ipcMain.handle('isProcessRunning', async (event, processName) => {
  try {
    return new Promise((resolve) => {
      const safeName = sanitizeProcessName(processName)
      if (!safeName) return resolve(false)
      const command =
        os.platform() === 'win32'
          ? `tasklist /FI "IMAGENAME eq ${safeName}"`
          : `pgrep -f "${safeName}"`

      exec(command, (error, stdout, stderr) => {
        // Si stdout contient le nom du processus, il est en cours d'exécution
        const isRunning = stdout.includes(safeName)
        console.log(`Processus ${processName} en cours d'exécution: ${isRunning}`)
        resolve(isRunning)
      })
    })
  } catch (error) {
    console.error('Erreur lors de la vérification du processus:', error)
    return false
  }
})

ipcMain.handle('killQBitTorrentAggressive', async () => {
  try {
    return new Promise((resolve, reject) => {
      const commands = [
        'taskkill /f /im qbittorrent.exe',
        'taskkill /f /im qBittorrent.exe',
        'taskkill /f /im qBittorrentPortable.exe',
        'taskkill /f /im qbittorrent.exe /t',
        'taskkill /f /im qBittorrent.exe /t',
      ]

      console.log('=== DÉBUT: Fermeture agressive de qBittorrent ===')

      let completedCommands = 0
      commands.forEach((command, index) => {
        console.log(`Exécution de la commande ${index + 1}: ${command}`)
        exec(command, (error, stdout, stderr) => {
          completedCommands++
          if (error) {
            console.log(`Commande ${index + 1} terminée avec erreur:`, error.message)
          } else {
            console.log(`Commande ${index + 1} exécutée avec succès`)
          }

          if (completedCommands === commands.length) {
            console.log('=== FIN: Fermeture agressive de qBittorrent ===')
            resolve(true)
          }
        })
      })
    })
  } catch (error) {
    console.error('Erreur lors de la fermeture agressive:', error)
    return false
  }
})

ipcMain.handle('getPortableAppsPath', () => {
  return getPortableAppsPath()
})

// Ouvrir le dossier racine PortableApps (rootDir si défini, sinon chemin par défaut)
ipcMain.handle('openPortableRoot', async (event) => {
  try {
    const configured = __loadPortableRoot()
    const target = configured && fs.existsSync(configured) ? configured : getPortableAppsPath()
    if (!target || !fs.existsSync(target)) return false
    shell.openPath(target)
    return true
  } catch (e) {
    console.error('openPortableRoot error:', e)
    return false
  }
})

// Obtenir l'icône d'un fichier exécutable en DataURL
ipcMain.handle('getFileIconDataUrl', async (_e, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null
    const img = await app.getFileIcon(filePath, { size: 'large' })
    return img ? img.toDataURL() : null
  } catch (e) {
    console.error('getFileIconDataUrl error:', e)
    return null
  }
})

// Watcher du dossier PortableApps → notifie le renderer
let __portableWatcher = null
let __portableWatcherDebounce = null
const __portableLogPath = path.join(os.tmpdir(), 'vw_portable.log')
const __godmodeLogPath = path.join(os.tmpdir(), 'vw_godmode.log')
function logPortable(text) {
  try {
    appendToRotatingLog(__portableLogPath, `[${new Date().toISOString()}] ${text}\n`)
  } catch {}
}
function logGod(text) {
  try {
    appendToRotatingLog(__godmodeLogPath, `[${new Date().toISOString()}] ${text}\n`)
  } catch {}
}

ipcMain.handle('startPortableWatch', async (event) => {
  try {
    const configured = __loadPortableRoot()
    const dir = configured && fs.existsSync(configured) ? configured : getPortableAppsPath()
    if (!dir || !fs.existsSync(dir)) return false
    if (__portableWatcher) {
      try {
        __portableWatcher.close()
      } catch {}
      __portableWatcher = null
    }
    __portableWatcher = fs.watch(dir, { recursive: true }, () => {
      clearTimeout(__portableWatcherDebounce)
      __portableWatcherDebounce = setTimeout(() => {
        try {
          event.sender.send('portable:changed', { dir })
        } catch {}
      }, 400)
    })
    return true
  } catch (e) {
    console.error('startPortableWatch error:', e)
    return false
  }
})

ipcMain.handle('portableGetLogFile', async () => {
  try {
    return ok(fs.existsSync(__portableLogPath) ? __portableLogPath : null)
  } catch (e) {
    return err(e)
  }
})
ipcMain.handle('godmodeGetLogFile', async () => {
  try {
    return ok(fs.existsSync(__godmodeLogPath) ? __godmodeLogPath : null)
  } catch (e) {
    return err(e)
  }
})

ipcMain.handle('launchApplicationWithCwd', async (event, executablePath, workingDirectory) => {
  try {
    console.log(`Tentative de lancement avec CWD: ${executablePath}`)
    console.log(`Répertoire de travail: ${workingDirectory}`)

    if (!fs.existsSync(executablePath)) {
      console.error(`Fichier introuvable: ${executablePath}`)
      throw new Error('Fichier exécutable introuvable')
    }

    // Vérifier que le répertoire de travail existe
    if (!fs.existsSync(workingDirectory)) {
      console.error(`Répertoire de travail introuvable: ${workingDirectory}`)
      throw new Error('Répertoire de travail introuvable')
    }

    // Lancer l'application avec le répertoire de travail spécifié
    const child = spawn(executablePath, [], {
      cwd: workingDirectory,
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        PATH: `${workingDirectory};${workingDirectory}/bin;${workingDirectory}/lib;${process.env.PATH}`,
        GIMP_DIR: workingDirectory,
        GIMP_PREFIX: workingDirectory,
        GIMP_DATA_DIR: path.join(workingDirectory, 'share/gimp/2.10'),
        GIMP_PLUGIN_DIR: path.join(workingDirectory, 'lib/gimp/2.0/plug-ins'),
        GIMP_SYSCONF_DIR: path.join(workingDirectory, 'etc/gimp/2.0'),
        GIMP_USER_DIR: path.join(workingDirectory, 'share/gimp/2.10'),
      },
    })

    console.log(`Processus créé avec PID: ${child.pid}`)

    // Attendre un peu pour voir si l'application se lance
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Vérifier si le processus est toujours en cours
    if (child.pid) {
      console.log(`Processus lancé avec PID: ${child.pid}`)
      return true
    } else {
      console.log(`Application lancée mais processus terminé rapidement`)
      return true // Considérer comme succès même si l'app se ferme
    }
  } catch (error) {
    console.error('Erreur lors du lancement avec CWD:', error)
    return false
  }
})

ipcMain.handle('checkSecureBootStatus', async () => {
  try {
    const command =
      'powershell -NoProfile -ExecutionPolicy Bypass -Command "try { (Confirm-SecureBootUEFI) | ConvertTo-Json } catch { \"Unknown\" }"'
    return await new Promise((resolve) => {
      exec(command, (error, stdout) => {
        if (error) {
          console.error('checkSecureBootStatus error:', error.message)
          return resolve(null)
        }
        const out = (stdout || '').trim()
        if (/true/i.test(out)) return resolve(true)
        if (/false/i.test(out)) return resolve(false)
        resolve(null)
      })
    })
  } catch (e) {
    return null
  }
})

ipcMain.handle('rebootToUEFI', async () => {
  try {
    const command = 'shutdown /r /fw /f /t 0'
    exec(command)
    return true
  } catch (e) {
    console.error('rebootToUEFI error:', e)
    return false
  }
})

ipcMain.handle('setUACEnabled', async (event, enabled) => {
  try {
    const okRun = await runAdminCmd([
      'reg',
      'add',
      'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System',
      '/v',
      'EnableLUA',
      '/t',
      'REG_DWORD',
      '/d',
      String(enabled ? 1 : 0),
      '/f',
    ])
    return okRun ? ok(true) : err('setUACEnabled failed')
  } catch (e) {
    console.error('setUACEnabled exception:', e)
    return err(e)
  }
})

ipcMain.handle('createRestorePoint', async (event, description) => {
  try {
    const safeDesc = String(description || 'VestyWinBox Restore Point')
      .replace(/"/g, "'")
      .slice(0, 120)
    const okRun = await runCmdSpawn([
      'powershell',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      'Checkpoint-Computer -Description',
      safeDesc,
      '-RestorePointType',
      'MODIFY_SETTINGS',
    ])
    return okRun ? ok(true) : err('createRestorePoint failed')
  } catch (e) {
    console.error('createRestorePoint exception:', e)
    return err(e)
  }
})

ipcMain.handle('generateBatteryReport', async () => {
  try {
    const outPath = path.join(os.homedir(), 'Desktop', 'battery-report.html')
    const okRun = await runCmdSpawn([
      'powercfg',
      '/batteryreport',
      '/output',
      outPath,
      '/duration',
      '1',
    ])
    return okRun ? ok(outPath) : err('generateBatteryReport failed')
  } catch (e) {
    console.error('generateBatteryReport exception:', e)
    return err(e)
  }
})

ipcMain.handle('runSystemHealthScan', async () => {
  try {
    const ok1 = await runAdminCmd(['DISM', '/Online', '/Cleanup-Image', '/RestoreHealth'])
    const ok2 = ok1 ? await runAdminCmd(['sfc', '/scannow']) : false
    return ok(ok1 && ok2)
  } catch (e) {
    console.error('runSystemHealthScan error:', e)
    return err(e)
  }
})

ipcMain.handle('setUltimatePerformancePlan', async () => {
  try {
    const ok1 = await runAdminCmd([
      'powercfg',
      '-duplicatescheme',
      'e9a42b02-d5df-448d-aa00-03f14749eb61',
    ])
    const ok2 = ok1
      ? await runAdminCmd(['powercfg', '-setactive', 'e9a42b02-d5df-448d-aa00-03f14749eb61'])
      : false
    return ok(ok1 && ok2)
  } catch (e) {
    console.error('setUltimatePerformancePlan exception:', e)
    return err(e)
  }
})

ipcMain.handle('cleanTempFiles', async () => {
  try {
    const ps = `Get-ChildItem $env:TEMP -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue`
    const okRun = await runCmdSpawn([
      'powershell',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      ps,
    ])
    return okRun ? ok(true) : err('cleanTempFiles failed')
  } catch (e) {
    console.error('cleanTempFiles exception:', e)
    return err(e)
  }
})

ipcMain.handle('setShowHiddenFiles', async (event, enable) => {
  try {
    const hiddenVal = enable ? 1 : 2
    const superHiddenVal = enable ? 1 : 0
    const ps = `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name Hidden -Type DWord -Value ${hiddenVal}; Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name ShowSuperHidden -Type DWord -Value ${superHiddenVal}`
    const okRun = await runCmdSpawn([
      'powershell',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      ps,
    ])
    return okRun ? ok(true) : err('setShowHiddenFiles failed')
  } catch (e) {
    console.error(e)
    return err(e)
  }
})

ipcMain.handle('setShowFileExtensions', async (event, enable) => {
  try {
    const hideVal = enable ? 0 : 1
    const ps = `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name HideFileExt -Type DWord -Value ${hideVal}`
    const okRun = await runCmdSpawn([
      'powershell',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      ps,
    ])
    return okRun ? ok(true) : err('setShowFileExtensions failed')
  } catch (e) {
    console.error(e)
    return err(e)
  }
})

ipcMain.handle('flushDNS', async () => {
  try {
    logGod('flushDNS')
    const okRun = await runCmdSpawn(['ipconfig', '/flushdns'])
    logGod(`flushDNS -> ${okRun ? 'OK' : 'ERR'}`)
    return okRun ? ok(true) : err('flushDNS failed')
  } catch (e) {
    console.error(e)
    return err(e)
  }
})

ipcMain.handle('openDeviceManager', async () => {
  try {
    exec('mmc devmgmt.msc')
    return true
  } catch (e) {
    return false
  }
})
ipcMain.handle('openDiskManagement', async () => {
  try {
    exec('diskmgmt.msc')
    return true
  } catch (e) {
    return false
  }
})
ipcMain.handle('openServices', async () => {
  try {
    exec('services.msc')
    return true
  } catch (e) {
    return false
  }
})
ipcMain.handle('openRegistryEditor', async () => {
  try {
    exec('regedit')
    return true
  } catch (e) {
    return false
  }
})

ipcMain.handle('restartExplorer', async () => {
  try {
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue; Start-Process explorer"`
    exec(cmd)
    return true
  } catch (e) {
    console.error(e)
    return false
  }
})

ipcMain.handle('openWindowsGodModeFolder', async () => {
  try {
    const folder = path.join(
      os.homedir(),
      'Desktop',
      'GodMode.{ED7BA470-8E54-465E-825C-99712043E01C}',
    )
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder)
    }
    shell.openPath(folder)
    return true
  } catch (e) {
    console.error(e)
    return false
  }
})

ipcMain.handle('setFirewallEnabled', async (event, enable) => {
  try {
    logGod(`setFirewallEnabled ${enable}`)
    const okRun = await runAdminCmd([
      'netsh',
      'advfirewall',
      'set',
      'allprofiles',
      'state',
      enable ? 'on' : 'off',
    ])
    logGod(`setFirewallEnabled -> ${okRun ? 'OK' : 'ERR'}`)
    return okRun ? ok(true) : err('setFirewallEnabled failed')
  } catch (e) {
    console.error(e)
    return err(e)
  }
})

ipcMain.handle('setDarkMode', async (event, dark) => {
  try {
    const apps = dark ? 0 : 1
    const system = dark ? 0 : 1
    const ps = `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' -Name AppsUseLightTheme -Type DWord -Value ${apps}; Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' -Name SystemUsesLightTheme -Type DWord -Value ${system}`
    logGod(`setDarkMode ${dark ? 'dark' : 'light'}`)
    const okRun = await runCmdSpawn([
      'powershell',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      ps,
    ])
    logGod(`setDarkMode -> ${okRun ? 'OK' : 'ERR'}`)
    return okRun ? ok(true) : err('setDarkMode failed')
  } catch (e) {
    console.error(e)
    return err(e)
  }
})

ipcMain.handle('chocoIsAvailable', async () => {
  try {
    return await new Promise((resolve) => {
      exec('choco -v', (error) => {
        resolve(!error)
      })
    })
  } catch {
    return false
  }
})

ipcMain.handle('installChocolatey', async () => {
  try {
    const ps = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString(''https://community.chocolatey.org/install.ps1''))"`
    const ok = await new Promise((resolve) => {
      exec(ps, (error) => resolve(!error))
    })
    return ok ? { ok: true, data: true } : { ok: false, message: 'installChocolatey failed' }
  } catch (e) {
    console.error('installChocolatey error:', e)
    return { ok: false, message: String(e) }
  }
})

ipcMain.handle('chocoListLocal', async () => {
  try {
    const { stdout, code } = await chocoSpawn(['list', '-l', '--no-color', '--limit-output'])
    if (code !== 0) return ok([])
    const lines = (stdout || '').split(/\r?\n/).filter(Boolean)
    const pkgs = lines.map((l) => {
      const [name, version] = l.split('|')
      return { name, version }
    })
    return ok(pkgs)
  } catch (e) {
    return err(e)
  }
})

ipcMain.handle('chocoSearch', async (event, query) => {
  try {
    const q = sanitizeCliToken(query)
    if (!q) return ok([])
    const { stdout, code } = await chocoSpawn(['search', q, '--no-color', '--limit-output'])
    if (code !== 0) return ok([])
    const lines = (stdout || '').split(/\r?\n/).filter(Boolean)
    const pkgs = lines.map((l) => {
      const [name, version] = l.split('|')
      return { name, version }
    })
    return ok(pkgs)
  } catch (e) {
    return err(e)
  }
})

ipcMain.handle('chocoInstall', async (event, name) => {
  try {
    if (!isSafePackageName(name)) return err('invalid package name')
    const n = sanitizeCliToken(name)
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -Verb RunAs -ArgumentList '/c choco install ${n} -y'"`
    const okRun = await new Promise((resolve) => {
      exec(cmd, (error) => resolve(!error))
    })
    return okRun ? ok(true) : err('chocoInstall failed')
  } catch (e) {
    return err(e)
  }
})

ipcMain.handle('chocoUpgrade', async (event, name) => {
  try {
    if (!isSafePackageName(name)) return err('invalid package name')
    const n = sanitizeCliToken(name)
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -Verb RunAs -ArgumentList '/c choco upgrade ${n} -y'"`
    const okRun = await new Promise((resolve) => {
      exec(cmd, (error) => resolve(!error))
    })
    return okRun ? ok(true) : err('chocoUpgrade failed')
  } catch (e) {
    return err(e)
  }
})

ipcMain.handle('chocoUninstall', async (event, name) => {
  try {
    if (!isSafePackageName(name)) return err('invalid package name')
    const n = sanitizeCliToken(name)
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -Verb RunAs -ArgumentList '/c choco uninstall ${n} -y'"`
    const okRun = await new Promise((resolve) => {
      exec(cmd, (error) => resolve(!error))
    })
    return okRun ? ok(true) : err('chocoUninstall failed')
  } catch (e) {
    return err(e)
  }
})

ipcMain.handle('chocoOutdated', async () => {
  try {
    const { stdout, code } = await chocoSpawn(['outdated', '--no-color', '--limit-output'])
    if (code !== 0) return ok([])
    const lines = (stdout || '').split(/\r?\n/).filter(Boolean)
    const out = lines.map((l) => {
      const parts = l.split('|')
      return { name: parts[0], current: parts[1], available: parts[2] }
    })
    return ok(out)
  } catch (e) {
    return err(e)
  }
})

ipcMain.handle('chocoInfo', async (event, name) => {
  try {
    if (!isSafePackageName(name)) return ok('')
    const n = sanitizeCliToken(name)
    const { stdout, code } = await chocoSpawn(['info', n, '--no-color'])
    return ok(code === 0 ? stdout || '' : '')
  } catch (e) {
    return err(e)
  }
})

ipcMain.handle('chocoListVersions', async (event, name) => {
  try {
    if (!isSafePackageName(name)) return ok([])
    const n = sanitizeCliToken(name)
    const { stdout, code } = await chocoSpawn([
      'list',
      n,
      '--all-versions',
      '--exact',
      '--no-color',
      '--limit-output',
    ])
    if (code !== 0) return ok([])
    const lines = (stdout || '').split(/\r?\n/).filter(Boolean)
    const versions = lines.map((l) => l.split('|')[1]).filter(Boolean)
    return ok(versions)
  } catch (e) {
    return err(e)
  }
})

// === BitLocker avancé ===
ipcMain.handle('bitlockerStatus', async () => {
  try {
    return await new Promise((resolve) => {
      exec('manage-bde -status', (error, stdout) => {
        if (error) return resolve([])
        const out = stdout || ''
        const blocks = out.split(/\n(?=Volume)/i)
        const results = []
        for (const b of blocks) {
          const letterMatch = b.match(/Volume\s+([A-Z]:)/i) || b.match(/Drive Letter:\s*([A-Z]:)/i)
          if (!letterMatch) continue
          const letter = letterMatch[1]
          const prot = (b.match(/Protection Status:\s*(.+)/i) || [])[1] || ''
          const conv = (b.match(/Conversion Status:\s*(.+)/i) || [])[1] || ''
          const percent = (b.match(/Percentage Encrypted:\s*(\d+)%/i) || [])[1] || ''
          results.push({
            letter,
            protection: prot.trim(),
            status: conv.trim(),
            percent: percent ? Number(percent) : null,
          })
        }
        resolve(results)
      })
    })
  } catch (e) {
    console.error('bitlockerStatus error:', e)
    return err(e)
  }
})

ipcMain.handle('bitlockerEnableDrive', async (_e, drive) => {
  try {
    if (!/^([A-Z]:)$/i.test(drive)) return false
    const d = drive.toUpperCase()
    const a = await runAdminCmd(['manage-bde', '-on', d, '-used', '-quiet'])
    const b = a ? await runAdminCmd(['manage-bde', '-protectors', '-add', d, '-rp']) : false
    return a && b
  } catch (e) {
    console.error('bitlockerEnableDrive error:', e)
    return false
  }
})

ipcMain.handle('bitlockerDisableDrive', async (_e, drive) => {
  try {
    if (!/^([A-Z]:)$/i.test(drive)) return false
    const d = drive.toUpperCase()
    return await runAdminCmd(['manage-bde', '-off', d, '-quiet'])
  } catch (e) {
    console.error('bitlockerDisableDrive error:', e)
    return false
  }
})

ipcMain.handle('bitlockerGetRecoveryKey', async (_e, drive) => {
  try {
    if (!/^([A-Z]:)$/i.test(drive)) return ''
    return await new Promise((resolve) => {
      exec(`manage-bde -protectors -get ${drive}`, (err, stdout) => {
        if (err) return resolve('')
        const txt = stdout || ''
        const m = txt.match(
          /Numerical Password:[\s\S]*?(\d{6}-\d{6}-\d{6}-\d{6}-\d{6}-\d{6}-\d{6}-\d{6})/i,
        )
        resolve(m ? m[1] : '')
      })
    })
  } catch (e) {
    console.error('bitlockerGetRecoveryKey error:', e)
    return ''
  }
})

ipcMain.handle('bitlockerSaveRecoveryKey', async (_e, drive) => {
  try {
    const key = await new Promise((resolve) => {
      exec(`manage-bde -protectors -get ${drive}`, (err, stdout) => {
        if (err) return resolve('')
        const txt = stdout || ''
        const m = txt.match(
          /Numerical Password:[\s\S]*?(\d{6}-\d{6}-\d{6}-\d{6}-\d{6}-\d{6}-\d{6}-\d{6})/i,
        )
        resolve(m ? m[1] : '')
      })
    })
    if (!key) return null
    const file = path.join(
      os.homedir(),
      'Desktop',
      `BitLocker-${String(drive).replace(':', '')}-RecoveryKey.txt`,
    )
    fs.writeFileSync(
      file,
      `Lecteur: ${drive}\nClé de récupération: ${key}\nDate: ${new Date().toISOString()}`,
      'utf-8',
    )
    return file
  } catch (e) {
    console.error('bitlockerSaveRecoveryKey error:', e)
    return null
  }
})

// === Windows Update pause avec durée ===
ipcMain.handle('windowsUpdatePauseDays', async (_e, days) => {
  try {
    const d = Math.max(1, Math.min(Number(days) || 7, 35))
    // Stop services maintenant
    await runAdminCmd(['net', 'stop', 'wuauserv'])
    await runAdminCmd(['net', 'stop', 'bits'])
    // Planifier reprise
    const target = new Date(Date.now() + d * 24 * 60 * 60 * 1000)
    const pad = (n) => String(n).padStart(2, '0')
    const mm = pad(target.getMonth() + 1)
    const dd = pad(target.getDate())
    const yyyy = target.getFullYear()
    const HH = pad(target.getHours())
    const MM = pad(target.getMinutes())
    const dateStr = `${mm}/${dd}/${yyyy}`
    const timeStr = `${HH}:${MM}`
    const okRun = await runCmdSpawn([
      'schtasks',
      '/Create',
      '/TN',
      'VW_ResumeWU',
      '/SC',
      'ONCE',
      '/TR',
      'cmd /c net start wuauserv & net start bits',
      '/ST',
      timeStr,
      '/SD',
      dateStr,
      '/F',
    ])
    return okRun ? ok(true) : err('windowsUpdatePauseDays failed')
  } catch (e) {
    console.error('windowsUpdatePauseDays error:', e)
    return err(e)
  }
})

// === Defender exclusions ===
ipcMain.handle('defenderListExclusions', async () => {
  try {
    return await new Promise((resolve) => {
      const ps = `powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-MpPreference).ExclusionPath | ForEach-Object { $_ }"`
      exec(ps, (err, stdout) => {
        if (err) return resolve([])
        const lines = (stdout || '')
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean)
        resolve(lines)
      })
    })
  } catch (e) {
    console.error('defenderListExclusions error:', e)
    return err(e)
  }
})

ipcMain.handle('defenderAddExclusion', async (_e, p) => {
  try {
    const pathStr = String(p || '')
    if (!pathStr || pathStr.length > 400) return err('invalid path')
    const safe = pathStr.replace(/\r|\n/g, ' ').replace(/"/g, '\"').slice(0, 400)
    const ps = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command Add-MpPreference -ExclusionPath \"${safe}\"'"`
    const okRun = await runCmdSpawn([
      'powershell',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      'Add-MpPreference -ExclusionPath',
      safe,
    ])
    return okRun ? ok(true) : err('defenderAddExclusion failed')
  } catch (e) {
    console.error('defenderAddExclusion error:', e)
    return err(e)
  }
})

ipcMain.handle('defenderRemoveExclusion', async (_e, p) => {
  try {
    const pathStr = String(p || '')
    if (!pathStr) return err('invalid path')
    const safe = pathStr.replace(/\r|\n/g, ' ').replace(/"/g, '\"').slice(0, 400)
    const ps = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command Remove-MpPreference -ExclusionPath \"${safe}\"'"`
    const okRun = await runCmdSpawn([
      'powershell',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      'Remove-MpPreference -ExclusionPath',
      safe,
    ])
    return okRun ? ok(true) : err('defenderRemoveExclusion failed')
  } catch (e) {
    console.error('defenderRemoveExclusion error:', e)
    return err(e)
  }
})

// Fonctions utilitaires
function findExeFiles(dir, maxDepth = 3) {
  const exeFiles = []

  function search(currentDir, depth = 0) {
    if (depth > maxDepth) return

    try {
      const files = fs.readdirSync(currentDir, { withFileTypes: true })

      for (const file of files) {
        const fullPath = path.join(currentDir, file.name)

        if (file.isDirectory()) {
          search(fullPath, depth + 1)
        } else if (file.name.toLowerCase().endsWith('.exe')) {
          exeFiles.push(fullPath)
        }
      }
    } catch (error) {
      // Dossier non accessible
    }
  }

  search(dir)
  return exeFiles
}

async function getFileVersion(filePath) {
  try {
    // Simulation de récupération de version
    return '1.0.0'
  } catch (error) {
    return 'Unknown'
  }
}

ipcMain.handle('resetNetworkStack', async () => {
  try {
    logGod('resetNetworkStack start')
    const a = await runAdminCmd(['netsh', 'int', 'ip', 'reset'])
    const b = a ? await runAdminCmd(['netsh', 'winsock', 'reset']) : false
    const c = b ? await runAdminCmd(['ipconfig', '/flushdns']) : false
    const d2 = c ? await runAdminCmd(['ipconfig', '/release']) : false
    const e2 = d2 ? await runAdminCmd(['ipconfig', '/renew']) : false
    logGod(`resetNetworkStack -> ${a && b && c && d2 && e2 ? 'OK' : 'ERR'}`)
    return ok(a && b && c && d2 && e2)
  } catch (e) {
    console.error('resetNetworkStack error:', e)
    return err(e)
  }
})

ipcMain.handle('clearWindowsUpdateCache', async () => {
  try {
    logGod('clearWindowsUpdateCache start')
    const a = await runAdminCmd(['net', 'stop', 'wuauserv'])
    const b = a ? await runAdminCmd(['net', 'stop', 'bits']) : false
    const c = b
      ? await runAdminCmd(['cmd', '/c', 'rd', '/s', '/q', '%windir%\\SoftwareDistribution'])
      : false
    const d2 = c ? await runAdminCmd(['net', 'start', 'wuauserv']) : false
    const e2 = d2 ? await runAdminCmd(['net', 'start', 'bits']) : false
    logGod(`clearWindowsUpdateCache -> ${a && b && c && d2 && e2 ? 'OK' : 'ERR'}`)
    return ok(a && b && c && d2 && e2)
  } catch (e) {
    console.error('clearWindowsUpdateCache error:', e)
    return err(e)
  }
})

ipcMain.handle('setHibernateEnabled', async (event, enable) => {
  try {
    logGod(`setHibernateEnabled ${enable}`)
    const r = await runAdminCmd(['powercfg', '-hibernate', enable ? 'on' : 'off'])
    logGod(`setHibernateEnabled -> ${r ? 'OK' : 'ERR'}`)
    return r
  } catch (e) {
    console.error('setHibernateEnabled error:', e)
    return false
  }
})

ipcMain.handle('emptyRecycleBin', async () => {
  try {
    logGod('emptyRecycleBin')
    const r = await runCmdSpawn([
      'powershell',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      'Clear-RecycleBin -Force',
    ])
    logGod(`emptyRecycleBin -> ${r ? 'OK' : 'ERR'}`)
    return r
  } catch (e) {
    console.error('emptyRecycleBin error:', e)
    return false
  }
})

ipcMain.handle('openWindowsUpdateSettings', async () => {
  try {
    shell.openExternal('ms-settings:windowsupdate')
    return true
  } catch (e) {
    console.error('openWindowsUpdateSettings error:', e)
    return false
  }
})

ipcMain.handle('rebootNow', async () => {
  try {
    logGod('rebootNow')
    const r = await runCmdSpawn(['shutdown', '/r', '/t', '0'])
    logGod(`rebootNow -> ${r ? 'OK' : 'ERR'}`)
    return r
  } catch (e) {
    console.error('rebootNow error:', e)
    return false
  }
})

ipcMain.handle('shutdownNow', async () => {
  try {
    logGod('shutdownNow')
    const r = await runCmdSpawn(['shutdown', '/s', '/t', '0'])
    logGod(`shutdownNow -> ${r ? 'OK' : 'ERR'}`)
    return r
  } catch (e) {
    console.error('shutdownNow error:', e)
    return false
  }
})

ipcMain.handle('openStartupFolder', async () => {
  try {
    const startup = path.join(
      os.homedir(),
      'AppData',
      'Roaming',
      'Microsoft',
      'Windows',
      'Start Menu',
      'Programs',
      'Startup',
    )
    if (!fs.existsSync(startup)) fs.mkdirSync(startup, { recursive: true })
    shell.openPath(startup)
    return true
  } catch (e) {
    console.error('openStartupFolder error:', e)
    return false
  }
})

ipcMain.handle('setFastStartup', async (event, enable) => {
  try {
    logGod(`setFastStartup ${enable}`)
    const okRun = await runAdminCmd([
      'reg',
      'add',
      'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power',
      '/v',
      'HiberbootEnabled',
      '/t',
      'REG_DWORD',
      '/d',
      String(enable ? 1 : 0),
      '/f',
    ])
    logGod(`setFastStartup -> ${okRun ? 'OK' : 'ERR'}`)
    return okRun ? ok(true) : err('setFastStartup failed')
  } catch (e) {
    console.error('setFastStartup error:', e)
    return err(e)
  }
})

ipcMain.handle('setRemoteDesktop', async (event, enable) => {
  try {
    logGod(`setRemoteDesktop ${enable}`)
    const deny = enable ? 0 : 1
    const a = await runAdminCmd([
      'reg',
      'add',
      'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal',
      'Server',
      '/v',
      'fDenyTSConnections',
      '/t',
      'REG_DWORD',
      '/d',
      String(deny),
      '/f',
    ])
    const b = enable
      ? await runAdminCmd([
          'netsh',
          'advfirewall',
          'firewall',
          'set',
          'rule',
          'group=Remote Desktop',
          'new',
          'enable=Yes',
        ])
      : true
    const okRun = a && b
    logGod(`setRemoteDesktop -> ${okRun ? 'OK' : 'ERR'}`)
    return okRun ? ok(true) : err('setRemoteDesktop failed')
  } catch (e) {
    console.error('setRemoteDesktop error:', e)
    return err(e)
  }
})

// --- GodMode extra toggles ---
ipcMain.handle('setDefenderRealtime', async (_e, enable) => {
  try {
    // enable => DisableRealtimeMonitoring 0; disable => 1
    const val = enable ? 0 : 1
    const ps = `Set-MpPreference -DisableRealtimeMonitoring ${val}`
    logGod(`setDefenderRealtime ${enable}`)
    const okRun = await runCmdSpawn([
      'powershell',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      ps,
    ])
    logGod(`setDefenderRealtime -> ${okRun ? 'OK' : 'ERR'}`)
    return okRun ? ok(true) : err('setDefenderRealtime failed')
  } catch (e) {
    console.error('setDefenderRealtime error:', e)
    return err(e)
  }
})

ipcMain.handle('setWindowsUpdatePaused', async (_e, pause) => {
  try {
    logGod(`setWindowsUpdatePaused ${pause}`)
    const okRun = pause
      ? (await runAdminCmd(['net', 'stop', 'wuauserv'])) &&
        (await runAdminCmd(['net', 'stop', 'bits']))
      : (await runAdminCmd(['net', 'start', 'wuauserv'])) &&
        (await runAdminCmd(['net', 'start', 'bits']))
    logGod(`setWindowsUpdatePaused -> ${okRun ? 'OK' : 'ERR'}`)
    return okRun ? ok(true) : err('setWindowsUpdatePaused failed')
  } catch (e) {
    console.error('setWindowsUpdatePaused error:', e)
    return err(e)
  }
})

ipcMain.handle('setBitLockerEnabled', async (_e, enable) => {
  try {
    logGod(`setBitLockerEnabled ${enable}`)
    const okRun = enable
      ? await runAdminCmd(['manage-bde', '-on', 'C:', '-used', '-quiet'])
      : await runAdminCmd(['manage-bde', '-off', 'C:', '-quiet'])
    logGod(`setBitLockerEnabled -> ${okRun ? 'OK' : 'ERR'}`)
    return ok(okRun)
  } catch (e) {
    console.error('setBitLockerEnabled error:', e)
    return err(e)
  }
})

// Dossier de sortie par défaut pour les conversions
ipcMain.handle('getDefaultOutputDir', async () => {
  try {
    const outDir = path.join(os.homedir(), 'Downloads', 'VestyWinBox', 'Converted')
    fs.mkdirSync(outDir, { recursive: true })
    return ok(outDir)
  } catch (e) {
    console.error(e)
    return err(e)
  }
})

// Sélection d'un dossier de sortie
ipcMain.handle('selectOutputDir', async () => {
  try {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    if (result.canceled || result.filePaths.length === 0) return null
    const chosen = result.filePaths[0]
    fs.mkdirSync(chosen, { recursive: true })
    return chosen
  } catch (e) {
    console.error(e)
    return null
  }
})

// Sélection de fichiers à convertir (retourne chemins, noms et tailles)
ipcMain.handle('selectFiles', async (event, options) => {
  try {
    const filters = Array.isArray(options?.filters) ? options.filters : []
    const result = await dialog.showOpenDialog({
      properties: ['openFile', ...(options?.multi ? ['multiSelections'] : [])],
      filters,
    })
    if (result.canceled || result.filePaths.length === 0) return ok([])
    const files = result.filePaths.map((p) => {
      let size = 0
      try {
        size = fs.statSync(p).size
      } catch {}
      return { path: p, name: path.basename(p), size }
    })
    return ok(files)
  } catch (e) {
    console.error(e)
    return err(e)
  }
})

// Sauvegarder une copie "convertie" (ici: simple copie/renommage)
ipcMain.handle('saveConvertedCopy', async (event, payload) => {
  try {
    const { sourcePath, outputDir, newFileName } = payload || {}
    if (!sourcePath || !outputDir || !newFileName) throw new Error('Paramètres invalides')
    fs.mkdirSync(outputDir, { recursive: true })
    const destPath = path.join(outputDir, newFileName)
    fs.copyFileSync(sourcePath, destPath)
    return ok(destPath)
  } catch (e) {
    console.error(e)
    return err(e)
  }
})

// Garde pour processus choco en cours (par sessionId)
const __chocoChildren = new Map()
const __chocoLogFiles = new Map()

function appendToRotatingLog(filePath, text, maxBytes = 5 * 1024 * 1024) {
  try {
    const dir = path.dirname(filePath)
    try {
      fs.mkdirSync(dir, { recursive: true })
    } catch {}
    let needRotate = false
    try {
      const st = fs.existsSync(filePath) ? fs.statSync(filePath) : null
      if (st && st.size >= maxBytes) needRotate = true
    } catch {}
    if (needRotate) {
      try {
        fs.copyFileSync(filePath, `${filePath}.1`)
      } catch {}
      try {
        fs.truncateSync(filePath, 0)
      } catch {}
    }
    fs.appendFileSync(filePath, String(text || ''))
  } catch {}
}

ipcMain.handle('chocoRun', async (event, payload) => {
  try {
    const { args, sessionId } = payload || {}
    if (!Array.isArray(args) || !sessionId) return false
    const safe = (Array.isArray(args) ? args : [])
      .map((a) => String(a))
      .map((a) => a.replace(/[\r\n]/g, ' ').trim())
      .filter((a) => a.length > 0 && a.length <= 256)
      .filter((a) => !/[|;&><`]/.test(a))
    if (!safe.length) return false
    // Utiliser spawn avec shell pour résoudre choco dans le PATH
    const child = spawn('choco', safe, { shell: true })
    __chocoChildren.set(sessionId, child)
    const tmpLog = path.join(os.tmpdir(), `vw_choco_${sessionId}.log`)
    try {
      fs.unlinkSync(tmpLog)
    } catch {}
    __chocoLogFiles.set(sessionId, tmpLog)
    child.stdout.on('data', (chunk) => {
      try {
        event.sender.send('choco:log', { sessionId, type: 'stdout', data: chunk.toString() })
      } catch {}
      try {
        appendToRotatingLog(tmpLog, chunk.toString())
      } catch {}
    })
    child.stderr.on('data', (chunk) => {
      try {
        event.sender.send('choco:log', { sessionId, type: 'stderr', data: chunk.toString() })
      } catch {}
      try {
        appendToRotatingLog(tmpLog, chunk.toString())
      } catch {}
    })
    child.on('close', (code) => {
      try {
        __chocoChildren.delete(sessionId)
      } catch {}
      try {
        event.sender.send('choco:exit', { sessionId, code })
      } catch {}
    })
    return ok(true)
  } catch (e) {
    console.error('chocoRun error:', e)
    return err(e)
  }
})

ipcMain.handle('chocoCancel', async (_event, sessionId) => {
  try {
    const child = __chocoChildren.get(sessionId)
    if (!child) return false
    const pid = child.pid
    // Essayer d'abord une termination gracieuse
    try {
      child.kill()
    } catch {}
    // Forcer sous Windows si nécessaire
    if (pid && process.platform === 'win32') {
      try {
        exec(`taskkill /PID ${pid} /T /F`)
      } catch {}
    }
    __chocoChildren.delete(sessionId)
    return ok(true)
  } catch (e) {
    console.error('chocoCancel error:', e)
    return err(e)
  }
})

// Exécution Chocolatey en administrateur (nouvelle fenêtre élevée)
ipcMain.handle('chocoRunElevated', async (event, payload) => {
  try {
    const { args, sessionId } = payload || {}
    if (!Array.isArray(args) || !sessionId) return false
    // On lance une fenêtre cmd élevée qui exécute choco en lui passant un --log-file, puis on streame ce fichier
    const tmpLog = path.join(os.tmpdir(), `vw_choco_${sessionId}.log`)
    try {
      fs.unlinkSync(tmpLog)
    } catch {}
    __chocoLogFiles.set(sessionId, tmpLog)
    const safe = args
      .map((a) => String(a))
      .map((a) => a.replace(/[\r\n]/g, ' ').trim())
      .filter((a) => a.length > 0 && a.length <= 256)
      .filter((a) => !/[|;&><`]/.test(a))
      .map((a) => a.replace(/"/g, '\\"'))
    const argStr = `${safe.join(' ')} --log-file \"${tmpLog}\"`
    // Ajouter un sentinel en fin de log pour détecter la fin
    const ps = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -Verb RunAs -ArgumentList '/c choco ${argStr} & echo __VW_DONE__>>\"${tmpLog}\"'"`
    exec(ps, (err) => {
      if (err) {
        try {
          event.sender.send('choco:log', { sessionId, type: 'stderr', data: String(err) })
        } catch {}
      }
    })
    // Poll le fichier de log pour streamer la sortie (best effort)
    let lastSize = 0
    const interval = setInterval(() => {
      try {
        if (fs.existsSync(tmpLog)) {
          const stat = fs.statSync(tmpLog)
          if (stat.size > lastSize) {
            const fd = fs.openSync(tmpLog, 'r')
            const buf = Buffer.alloc(stat.size - lastSize)
            fs.readSync(fd, buf, 0, buf.length, lastSize)
            fs.closeSync(fd)
            lastSize = stat.size
            const text = buf.toString()
            event.sender.send('choco:log', { sessionId, type: 'stdout', data: text })
            if (text.includes('__VW_DONE__')) {
              try {
                event.sender.send('choco:exit', { sessionId, code: 0 })
              } catch {}
            }
          }
        }
      } catch {}
    }, 500)
    let idleTimer = setTimeout(() => {
      try {
        event.sender.send('choco:exit', { sessionId, code: 0 })
      } catch {}
      clearInterval(interval)
    }, 120000)
    const unlisten = (event2, msg) => {
      if (msg?.sessionId === sessionId && msg?.type) {
        clearTimeout(idleTimer)
        idleTimer = setTimeout(() => {
          try {
            event.sender.send('choco:exit', { sessionId, code: 0 })
          } catch {}
          clearInterval(interval)
        }, 120000)
      }
    }
    event.sender.on('choco:log', unlisten)
    return ok(true)
  } catch (e) {
    console.error('chocoRunElevated error:', e)
    return err(e)
  }
})

ipcMain.handle('openEventViewer', async () => {
  try {
    exec('eventvwr.msc')
    return true
  } catch (e) {
    console.error(e)
    return false
  }
})
ipcMain.handle('openTaskScheduler', async () => {
  try {
    exec('taskschd.msc')
    return true
  } catch (e) {
    console.error(e)
    return false
  }
})
ipcMain.handle('openComputerManagement', async () => {
  try {
    exec('compmgmt.msc')
    return true
  } catch (e) {
    console.error(e)
    return false
  }
})
ipcMain.handle('openPerformanceMonitor', async () => {
  try {
    exec('perfmon.msc')
    return true
  } catch (e) {
    console.error(e)
    return false
  }
})
ipcMain.handle('openSystemInfo', async () => {
  try {
    exec('msinfo32')
    return true
  } catch (e) {
    console.error(e)
    return false
  }
})
ipcMain.handle('openProgramsAndFeatures', async () => {
  try {
    exec('control appwiz.cpl')
    return true
  } catch (e) {
    console.error(e)
    return false
  }
})
ipcMain.handle('openWindowsFeatures', async () => {
  try {
    exec('optionalfeatures')
    return true
  } catch (e) {
    console.error(e)
    return false
  }
})
ipcMain.handle('openNetworkConnections', async () => {
  try {
    exec('ncpa.cpl')
    return true
  } catch (e) {
    console.error(e)
    return false
  }
})
ipcMain.handle('openFirewallControl', async () => {
  try {
    exec('control firewall.cpl')
    return true
  } catch (e) {
    console.error(e)
    return false
  }
})
ipcMain.handle('openGroupPolicy', async () => {
  try {
    exec('gpedit.msc')
    return true
  } catch (e) {
    console.error(e)
    return false
  }
})
ipcMain.handle('openLocalSecurityPolicy', async () => {
  try {
    exec('secpol.msc')
    return true
  } catch (e) {
    console.error(e)
    return false
  }
})
ipcMain.handle('openSystemPropertiesAdvanced', async () => {
  try {
    exec('SystemPropertiesAdvanced')
    return true
  } catch (e) {
    console.error(e)
    return false
  }
})
ipcMain.handle('openEnvironmentVariablesDialog', async () => {
  try {
    exec('rundll32 sysdm.cpl,EditEnvironmentVariables')
    return true
  } catch (e) {
    console.error(e)
    return false
  }
})

// --- Helpers conversion ---
function commandExists(cmd) {
  try {
    const res = execSync ? execSync(`where ${cmd}`) : null
    return !!res
  } catch {
    return false
  }
}

const hasToolCache = {}
function hasTool(name) {
  if (hasToolCache[name] !== undefined) return hasToolCache[name]
  try {
    const out = require('child_process')
      .execSync(`where ${name}`, { stdio: ['ignore', 'pipe', 'pipe'] })
      .toString()
      .trim()
    hasToolCache[name] = out.length > 0
  } catch {
    hasToolCache[name] = false
  }
  return hasToolCache[name]
}

ipcMain.handle('detectConverters', async () => {
  return ok({
    ffmpeg: hasTool('ffmpeg'),
    magick: hasTool('magick'),
    sevenZip: hasTool('7z') || hasTool('7za') || hasTool('7z.exe'),
    libreoffice: hasTool('soffice'),
    gs: hasTool('gs'),
  })
})

// payload: { type, files: [{path,name}], outputFormat, outputDir, sessionId }
ipcMain.handle('convertFiles', async (event, payload) => {
  const { type, files, outputFormat, outputDir, sessionId, options } = payload || {}
  if (!Array.isArray(files) || !outputFormat || !outputDir || !sessionId) return false
  try {
    fs.mkdirSync(outputDir, { recursive: true })
  } catch {}

  const send = (channel, msg) => {
    try {
      event.sender.send(channel, { sessionId, ...msg })
    } catch {}
  }

  // Préparer un fichier de log rotatif par session
  const convLogPath = path.join(os.tmpdir(), `vw_conv_${sessionId}.log`)
  try {
    fs.unlinkSync(convLogPath)
  } catch {}
  __convertLogFiles.set(sessionId, convLogPath)

  for (const f of files) {
    const src = f.path
    const base = f.name || path.basename(src)
    const nameOnly = base.includes('.') ? base.substring(0, base.lastIndexOf('.')) : base
    const dest = path.join(outputDir, `${nameOnly}.${outputFormat.toLowerCase()}`)

    let child = null
    try {
      if (type === 'video' || type === 'audio') {
        if (hasTool('ffmpeg')) {
          const args = ['-y', '-i', src]
          if (type === 'video') {
            const preset = options?.videoPreset || 'medium'
            const crf = String(options?.videoCrf ?? 23)
            const abr = String(options?.audioBitrateK ?? 192) + 'k'
            args.push('-c:v', 'libx264', '-preset', preset, '-crf', crf, '-c:a', 'aac', '-b:a', abr)
          } else {
            const abr = String(options?.audioBitrateK ?? 192) + 'k'
            args.push('-vn', '-c:a', 'aac', '-b:a', abr)
          }
          args.push(dest)
          child = spawn('ffmpeg', args, { shell: true })
          __convertChildren.set(sessionId, child)
          child.stderr.on('data', (d) => {
            const t = d.toString()
            try {
              appendToRotatingLog(convLogPath, t)
            } catch {}
            send('convert:progress', { file: f.name, line: t })
          })
          child.stdout?.on('data', (d) => {
            const t = d.toString()
            try {
              appendToRotatingLog(convLogPath, t)
            } catch {}
          })
        }
      } else if (type === 'image') {
        if (hasTool('magick')) {
          // ImageMagick
          child = spawn('magick', [src, dest], { shell: true })
          __convertChildren.set(sessionId, child)
          child.stderr.on('data', (d) => {
            const t = d.toString()
            try {
              appendToRotatingLog(convLogPath, t)
            } catch {}
            send('convert:progress', { file: f.name, line: t })
          })
          child.stdout?.on('data', (d) => {
            const t = d.toString()
            try {
              appendToRotatingLog(convLogPath, t)
            } catch {}
          })
        } else if (hasTool('ffmpeg')) {
          child = spawn('ffmpeg', ['-y', '-i', src, dest], { shell: true })
          __convertChildren.set(sessionId, child)
          child.stderr.on('data', (d) => {
            const t = d.toString()
            try {
              appendToRotatingLog(convLogPath, t)
            } catch {}
            send('convert:progress', { file: f.name, line: t })
          })
          child.stdout?.on('data', (d) => {
            const t = d.toString()
            try {
              appendToRotatingLog(convLogPath, t)
            } catch {}
          })
        }
      } else if (type === 'archive') {
        // Convert to zip/7z/tar minimal
        const ext = outputFormat.toLowerCase()
        const seven = hasTool('7z') ? '7z' : hasTool('7za') ? '7za' : null
        if (seven && (ext === 'zip' || ext === '7z' || ext === 'tar')) {
          const tflag = ext === 'zip' ? '-tzip' : ext === '7z' ? '-t7z' : '-ttar'
          child = spawn(seven, ['a', tflag, dest, src], { shell: true })
          __convertChildren.set(sessionId, child)
          child.stdout.on('data', (d) => {
            const t = d.toString()
            try {
              appendToRotatingLog(convLogPath, t)
            } catch {}
            send('convert:progress', { file: f.name, line: t })
          })
          child.stderr.on('data', (d) => {
            const t = d.toString()
            try {
              appendToRotatingLog(convLogPath, t)
            } catch {}
            send('convert:progress', { file: f.name, line: t })
          })
        }
      } else if (type === 'document') {
        // LibreOffice convert-to (doc/xls/ppt/txt/html/pdf)
        if (hasTool('soffice')) {
          const outdir = outputDir
          child = spawn(
            'soffice',
            [
              '--headless',
              '--norestore',
              '--convert-to',
              outputFormat.toLowerCase(),
              '--outdir',
              outdir,
              src,
            ],
            { shell: true },
          )
          __convertChildren.set(sessionId, child)
          child.stdout.on('data', (d) => {
            const t = d.toString()
            try {
              appendToRotatingLog(convLogPath, t)
            } catch {}
            send('convert:progress', { file: f.name, line: t })
          })
          child.stderr.on('data', (d) => {
            const t = d.toString()
            try {
              appendToRotatingLog(convLogPath, t)
            } catch {}
            send('convert:progress', { file: f.name, line: t })
          })
        }
      }

      if (!child) {
        // Fallback: simple copie/renommage
        fs.copyFileSync(src, dest)
        send('convert:fileDone', { file: f.name, success: true, output: dest })
        continue
      }

      await new Promise((resolve) => {
        child.on('close', (code) => {
          try {
            __convertChildren.delete(sessionId)
          } catch {}
          const success = code === 0 && fs.existsSync(dest)
          send('convert:fileDone', { file: f.name, success, output: success ? dest : null })
          resolve(true)
        })
      })
    } catch (e) {
      console.error('convert error', e)
      send('convert:fileDone', { file: f.name, success: false, error: String(e) })
    }
  }

  send('convert:sessionDone', { done: true })
  return ok(true)
})

// === Analytics temps réel ===
let __lastCpuInfo = null
let __lastNet = { bytes: 0, ts: 0 }
function getCpuPercent() {
  const cpus = os.cpus()
  const aggregate = (cs) =>
    cs.reduce(
      (acc, c) => {
        acc.user += c.times.user
        acc.nice += c.times.nice
        acc.sys += c.times.sys
        acc.idle += c.times.idle
        acc.irq += c.times.irq
        return acc
      },
      { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
    )
  const now = aggregate(cpus)
  if (!__lastCpuInfo) {
    __lastCpuInfo = now
    return 0
  }
  const prev = __lastCpuInfo
  const idle = now.idle - prev.idle
  const total = now.user - now.user + prev.user ? now.user - prev.user : now.user // placeholder, fix below
  const userd = now.user - prev.user
  const sysd = now.sys - prev.sys
  const niced = now.nice - prev.nice
  const irqd = now.irq - prev.irq
  const totald = userd + sysd + niced + irqd + idle
  __lastCpuInfo = now
  if (totald <= 0) return 0
  const busy = totald - idle
  return Math.max(0, Math.min(100, Math.round((busy / totald) * 100)))
}

function getMemPercent() {
  const total = os.totalmem()
  const free = os.freemem()
  const used = total - free
  return Math.max(0, Math.min(100, Math.round((used / total) * 100)))
}

function getDiskUsedPercent() {
  try {
    // Approx: utiliser taille/occupé du lecteur système (C:) via fs.statvfs n'existe pas; fallback à pourcentage utilisé basé sur fichiers? Utilisons wmic.
    const out = require('child_process').execSync(
      'wmic logicaldisk where "DeviceID=\"C:\\\\"" get Size,FreeSpace /format:value',
      { encoding: 'utf8' },
    )
    const freeMatch = out.match(/FreeSpace=(\d+)/)
    const sizeMatch = out.match(/Size=(\d+)/)
    const free = freeMatch ? parseInt(freeMatch[1], 10) : 0
    const size = sizeMatch ? parseInt(sizeMatch[1], 10) : 0
    if (size > 0) {
      const used = size - free
      return Math.max(0, Math.min(100, Math.round((used / size) * 100)))
    }
  } catch {}
  return 0
}

function getNetworkKbps() {
  try {
    // netstat -e retourne octets reçus/envoyés cumulés depuis boot
    const out = require('child_process').execSync('netstat -e', { encoding: 'utf8' })
    const line = out.split(/\r?\n/).find((l) => /octets|Bytes/i.test(l) && /\d/.test(l))
    if (line) {
      const nums = line.match(/(\d+)/g)
      if (nums && nums.length >= 2) {
        const rx = parseInt(nums[0], 10)
        const tx = parseInt(nums[1], 10)
        const total = rx + tx
        const now = Date.now()
        const dt = __lastNet.ts ? (now - __lastNet.ts) / 1000 : 0
        let kbps = 0
        if (dt > 0) {
          kbps = (total - __lastNet.bytes) / 1024 / dt
        }
        __lastNet = { bytes: total, ts: now }
        return Math.max(0, Math.round(kbps))
      }
    }
  } catch {}
  return 0
}

ipcMain.handle('getRealtimeAnalytics', async () => {
  // Calcul CPU: corriger bug total calc
  const cpus = os.cpus()
  const sum = (c) => Object.values(c.times).reduce((a, b) => a + b, 0)
  const agg = cpus.reduce(
    (acc, c) => {
      acc.user += c.times.user
      acc.nice += c.times.nice
      acc.sys += c.times.sys
      acc.idle += c.times.idle
      acc.irq += c.times.irq
      return acc
    },
    { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
  )
  if (!__lastCpuInfo) __lastCpuInfo = agg
  const prev = __lastCpuInfo
  const idleDelta = agg.idle - prev.idle
  const totalPrev = prev.user + prev.nice + prev.sys + prev.idle + prev.irq
  const totalNow = agg.user + agg.nice + agg.sys + agg.idle + agg.irq
  const totalDelta = totalNow - totalPrev
  const cpu =
    totalDelta > 0
      ? Math.max(0, Math.min(100, Math.round(((totalDelta - idleDelta) / totalDelta) * 100)))
      : 0
  __lastCpuInfo = agg

  const mem = getMemPercent()
  const disk = getDiskUsedPercent()
  const net = getNetworkKbps()
  return ok({ cpu, memory: mem, disk, networkKbps: net })
})

// Persistance simple du dossier racine des apps portables
const __portableRootFile = () => path.join(app.getPath('userData'), 'portable_root.json')
function __loadPortableRoot() {
  try {
    const p = fs.readFileSync(__portableRootFile(), 'utf-8')
    const j = JSON.parse(p)
    return j && typeof j.path === 'string' ? j.path : null
  } catch {
    return null
  }
}
function __savePortableRoot(dir) {
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true })
  } catch {}
  try {
    fs.writeFileSync(__portableRootFile(), JSON.stringify({ path: dir }), 'utf-8')
    return true
  } catch {
    return false
  }
}

ipcMain.handle('getPortableRootDir', async () => {
  return __loadPortableRoot()
})

ipcMain.handle('setPortableRootDir', async (_e, dir) => {
  if (!dir || typeof dir !== 'string') return false
  return __savePortableRoot(dir)
})

ipcMain.handle('chooseDirectory', async (_e, options) => {
  try {
    const res = await dialog.showOpenDialog({
      title: (options && options.title) || 'Choisir un dossier',
      defaultPath: (options && options.defaultPath) || undefined,
      properties: ['openDirectory'],
    })
    if (res.canceled || !res.filePaths || !res.filePaths[0]) return null
    return res.filePaths[0]
  } catch (e) {
    console.error('chooseDirectory error:', e)
    return null
  }
})

// Lancement en administrateur
ipcMain.handle('launchApplicationElevated', async (_e, executablePath) => {
  try {
    if (!fs.existsSync(executablePath)) return false
    const wd = path.dirname(executablePath)
    const ps = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '${executablePath.replace(/'/g, "''")}' -WorkingDirectory '${wd.replace(/'/g, "''")}' -Verb RunAs"`
    exec(ps)
    return true
  } catch (e) {
    console.error('launchApplicationElevated error:', e)
    return false
  }
})

ipcMain.handle('launchApplicationWithCwdElevated', async (_e, executablePath, workingDirectory) => {
  try {
    if (!fs.existsSync(executablePath)) return false
    const wd =
      workingDirectory && fs.existsSync(workingDirectory)
        ? workingDirectory
        : path.dirname(executablePath)
    const ps = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '${executablePath.replace(/'/g, "''")}' -WorkingDirectory '${wd.replace(/'/g, "''")}' -Verb RunAs"`
    exec(ps)
    return true
  } catch (e) {
    console.error('launchApplicationWithCwdElevated error:', e)
    return false
  }
})

function getAssetsIconsPath() {
  const isDev = process.env.NODE_ENV === 'development'
  return isDev
    ? path.join(__dirname, '../assets/icons')
    : path.join(process.resourcesPath, 'app.asar.unpacked/assets/icons')
}

function walkDirCollect(dir, collector, maxDepth = 5, depth = 0) {
  if (depth > maxDepth) return
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const ent of entries) {
      const p = path.join(dir, ent.name)
      if (ent.isDirectory()) walkDirCollect(p, collector, maxDepth, depth + 1)
      else collector.push(p)
    }
  } catch {}
}

function toSlug(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

ipcMain.handle('findIconForName', async (_e, name) => {
  try {
    const iconsRoot = getAssetsIconsPath()
    const files = []
    walkDirCollect(iconsRoot, files)
    const slug = toSlug(name)
    const candidates = files.filter((f) => /\.(ico|png|jpg|jpeg|bmp)$/i.test(f))
    const match = candidates.find((f) => {
      const base = path.basename(f).toLowerCase()
      const baseSlug = toSlug(base.replace(/\.(ico|png|jpg|jpeg|bmp)$/i, ''))
      return base.includes(slug) || baseSlug.includes(slug) || slug.includes(baseSlug)
    })
    if (match && fs.existsSync(match)) {
      const fileUrl = 'file://' + match.replace(/\\/g, '/')
      return fileUrl
    }
    return null
  } catch (e) {
    console.error('findIconForName error:', e)
    return null
  }
})

// Importer un exécutable dans le dossier PortableApps
ipcMain.handle('importPortableExe', async (_e, payload) => {
  try {
    const { sourcePath, targetName } = payload || {}
    if (!sourcePath || !fs.existsSync(sourcePath)) return null
    const configured = __loadPortableRoot()
    let root = configured && fs.existsSync(configured) ? configured : getPortableAppsPath()
    // Si la racine est le dossier 'assets', corriger vers 'assets/Apps portable'
    try {
      if (path.basename(root).toLowerCase() === 'assets') {
        root = path.join(root, 'Apps portable')
      }
      fs.mkdirSync(root, { recursive: true })
    } catch {}
    if (!root || !fs.existsSync(root)) return null
    const baseName =
      targetName && String(targetName).trim()
        ? String(targetName).trim()
        : path.basename(sourcePath, path.extname(sourcePath))
    const safeFolder = baseName.replace(/[^a-zA-Z0-9._\- ]+/g, '_')
    const destFolder = path.join(root, safeFolder)
    fs.mkdirSync(destFolder, { recursive: true })
    let destPath = path.join(destFolder, path.basename(sourcePath))
    if (fs.existsSync(destPath)) {
      const stamp = Date.now()
      destPath = path.join(
        destFolder,
        `${path.basename(sourcePath, path.extname(sourcePath))}-${stamp}${path.extname(sourcePath)}`,
      )
    }
    fs.copyFileSync(sourcePath, destPath)
    return destPath
  } catch (e) {
    console.error('importPortableExe error:', e)
    return null
  }
})

ipcMain.handle('pingResult', async () => {
  try {
    return ok({ ok: true, data: 'pong' })
  } catch (e) {
    return err(e)
  }
})

// Track ongoing convert processes per session
const __convertChildren = new Map()
const __convertControls = new Map()
const __convertLogFiles = new Map()

ipcMain.handle('convertCancel', async (_e, sessionId) => {
  try {
    const child = __convertChildren.get(sessionId)
    if (!child) return false
    try {
      child.kill()
    } catch {}
    // Forcer la terminaison de l'arborescence sous Windows
    try {
      if (process.platform === 'win32' && child.pid) {
        exec(`taskkill /PID ${child.pid} /T /F`)
      }
    } catch {}
    try {
      __convertChildren.delete(sessionId)
    } catch {}
    try {
      __convertControls.delete(sessionId)
    } catch {}
    return ok(true)
  } catch (e) {
    console.error('convertCancel error:', e)
    return err(e)
  }
})

ipcMain.handle('convertPause', async (_e, sessionId) => {
  try {
    let ctl = __convertControls.get(sessionId)
    if (!ctl) {
      ctl = { paused: false, resumeResolver: null, skipRequested: false }
      __convertControls.set(sessionId, ctl)
    }
    ctl.paused = true
    return ok(true)
  } catch (e) {
    return err(e)
  }
})

ipcMain.handle('convertResume', async (_e, sessionId) => {
  try {
    const ctl = __convertControls.get(sessionId)
    if (ctl) {
      ctl.paused = false
      if (ctl.resumeResolver) {
        try {
          ctl.resumeResolver()
        } catch {}
        ctl.resumeResolver = null
      }
    }
    return ok(true)
  } catch (e) {
    return err(e)
  }
})

ipcMain.handle('convertSkip', async (_e, sessionId) => {
  try {
    const child = __convertChildren.get(sessionId)
    let ctl = __convertControls.get(sessionId)
    if (!ctl) {
      ctl = { paused: false, resumeResolver: null, skipRequested: false }
      __convertControls.set(sessionId, ctl)
    }
    ctl.skipRequested = true
    if (child) {
      try {
        child.kill()
      } catch {}
      if (process.platform === 'win32' && child.pid) {
        try {
          exec(`taskkill /PID ${child.pid} /T /F`)
        } catch {}
      }
    }
    return ok(true)
  } catch (e) {
    return err(e)
  }
})

// Helpers de sanitisation et exécutions choco sûres
function sanitizeCliToken(input) {
  return String(input || '')
    .replace(/[\r\n]/g, ' ')
    .replace(/[|;&><`]/g, '')
    .trim()
    .slice(0, 256)
}
function isSafePackageName(name) {
  return /^[A-Za-z0-9][A-Za-z0-9._+-]*$/.test(String(name || ''))
}
function chocoSpawn(args) {
  const safe = (Array.isArray(args) ? args : [])
    .map((a) => sanitizeCliToken(a))
    .filter((a) => a.length > 0)
  return new Promise((resolve) => {
    const child = spawn('choco', safe, { shell: true })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => {
      out += d.toString()
    })
    child.stderr.on('data', (d) => {
      err += d.toString()
    })
    child.on('close', (code) => resolve({ code, stdout: out, stderr: err }))
  })
}
// Sanitisation des noms de processus (Windows)
function sanitizeProcessName(name) {
  const n = String(name || '').trim()
  if (!n) return ''
  // Autoriser lettres/chiffres/_-. et forcer suffixe .exe optionnel
  const m = n.match(/^[A-Za-z0-9_.\-]+(\.exe)?$/i)
  return m ? m[0] : ''
}

// IPC pour auto‑update
ipcMain.handle('updateCheck', async () => {
  try {
    if (!autoUpdater) return { ok: false, message: 'autoUpdater indisponible' }
    const res = await autoUpdater.checkForUpdates()
    return { ok: true, data: !!res?.updateInfo }
  } catch (e) {
    return { ok: false, message: String(e) }
  }
})

ipcMain.handle('updateDownload', async () => {
  try {
    if (!autoUpdater) return { ok: false, message: 'autoUpdater indisponible' }
    await autoUpdater.downloadUpdate()
    return { ok: true, data: true }
  } catch (e) {
    return { ok: false, message: String(e) }
  }
})

ipcMain.handle('updateInstallNow', async () => {
  try {
    if (!autoUpdater) return { ok: false, message: 'autoUpdater indisponible' }
    setImmediate(() => {
      try {
        autoUpdater.quitAndInstall()
      } catch {}
    })
    return { ok: true, data: true }
  } catch (e) {
    return { ok: false, message: String(e) }
  }
})

ipcMain.handle('chocoGetLogFile', async (_e, sessionId) => {
  try {
    const p = __chocoLogFiles.get(sessionId)
    if (p && fs.existsSync(p)) return ok(p)
    return ok(null)
  } catch (e) {
    return err(e)
  }
})

ipcMain.handle('convertGetLogFile', async (_e, sessionId) => {
  try {
    const p = __convertLogFiles.get(sessionId)
    if (p && fs.existsSync(p)) return ok(p)
    return ok(null)
  } catch (e) {
    return err(e)
  }
})
