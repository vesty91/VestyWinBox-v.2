interface SynologyCredentials {
  host: string
  username: string
  password: string
}

interface SynologySession {
  sid: string
  did?: string
  isAdmin: boolean
  username: string
}

interface FileInfo {
  isdir: boolean
  name: string
  path: string
  size?: number
  mt: number // modification time
  type?: string
}

interface ShareInfo {
  name: string
  path: string
  desc: string
  vol_path: string
  enable: boolean
}

interface SystemInfo {
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  network_usage: number
  temperature: number
  uptime: number
}

interface VolumeInfo {
  id: string
  desc: string
  total_space: number
  used_space: number
  free_space: number
  status: string
}

class SynologyApiService {
  private baseUrl: string
  private session: SynologySession | null = null
  private apiInfo: any = null

  constructor(host: string) {
    // En mode Electron, on utilise toujours la connexion directe
    // car l'API Electron bypass automatiquement CORS
    if (host.startsWith('http')) {
      this.baseUrl = host
    } else {
      this.baseUrl = `https://${host}`
    }
  }

  // Step 1: Get API Info
  async getApiInfo(): Promise<any> {
    try {
      const url = `${this.baseUrl}/webapi/query.cgi?api=SYNO.API.Info&version=1&method=query&query=all`

      // Add headers to handle CORS
      // Utiliser l'API Electron pour bypass CORS
      const response = await (window as any).electronAPI.fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        this.apiInfo = data.data
        return this.apiInfo
      } else {
        throw new Error(`Failed to get API info: ${this.getErrorMessage(data.error?.code)}`)
      }
    } catch (error: any) {
      console.error('Error getting API info:', error)

      // Check for specific CORS/network errors
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        throw new Error(
          `Erreur de connexion: Impossible d'accéder au NAS à l'adresse ${this.baseUrl}. Vérifiez que l'adresse est correcte et que le NAS est accessible.`,
        )
      }

      throw new Error(`Erreur API: ${error.message}`)
    }
  }

  // Step 2: Authenticate
  async authenticate(credentials: SynologyCredentials): Promise<SynologySession> {
    try {
      if (!this.apiInfo) {
        await this.getApiInfo()
      }

      const authApi = this.apiInfo['SYNO.API.Auth']
      const authPath = authApi.path
      const authVersion = authApi.maxVersion

      const params = new URLSearchParams({
        api: 'SYNO.API.Auth',
        version: authVersion.toString(),
        method: 'login',
        account: credentials.username,
        passwd: credentials.password,
        session: 'FileStation',
        format: 'sid',
      })

      const response = await (window as any).electronAPI.fetch(
        `${this.baseUrl}/webapi/${authPath}?${params}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        this.session = {
          sid: data.data.sid,
          did: data.data.did,
          isAdmin: data.data.is_portal_port || false,
          username: credentials.username,
        }

        // Store session in localStorage for persistence
        localStorage.setItem('synology_session', JSON.stringify(this.session))
        localStorage.setItem('synology_host', this.baseUrl)

        return this.session
      } else {
        throw new Error(`Authentication failed: ${this.getErrorMessage(data.error?.code)}`)
      }
    } catch (error) {
      console.error('Authentication error:', error)
      throw error
    }
  }

  // Check if we have a valid session
  isAuthenticated(): boolean {
    if (this.session) return true

    // Try to restore from localStorage
    const storedSession = localStorage.getItem('synology_session')
    const storedHost = localStorage.getItem('synology_host')

    if (storedSession && storedHost) {
      try {
        this.session = JSON.parse(storedSession)
        this.baseUrl = storedHost
        return true
      } catch (e) {
        this.clearSession()
      }
    }

    return false
  }

  // Logout
  async logout(): Promise<void> {
    if (this.session) {
      try {
        const authApi = this.apiInfo['SYNO.API.Auth']
        const params = new URLSearchParams({
          api: 'SYNO.API.Auth',
          version: authApi.maxVersion.toString(),
          method: 'logout',
          session: 'FileStation',
          _sid: this.session.sid,
        })

        await (window as any).electronAPI.fetch(`${this.baseUrl}/webapi/${authApi.path}?${params}`)
      } catch (error) {
        console.error('Logout error:', error)
      }
    }

    this.clearSession()
  }

  private clearSession(): void {
    this.session = null
    localStorage.removeItem('synology_session')
    localStorage.removeItem('synology_host')
  }

  // Get shared folders
  async getSharedFolders(): Promise<ShareInfo[]> {
    if (!this.session) throw new Error('Not authenticated')

    try {
      const fileStationApi = this.apiInfo['SYNO.FileStation.List']
      const params = new URLSearchParams({
        api: 'SYNO.FileStation.List',
        version: fileStationApi.maxVersion.toString(),
        method: 'list_share',
        _sid: this.session.sid,
      })

      const response = await (window as any).electronAPI.fetch(
        `${this.baseUrl}/webapi/${fileStationApi.path}?${params}`,
      )
      const data = await response.json()

      if (data.success) {
        return data.data.shares
      } else {
        throw new Error(`Failed to get shared folders: ${this.getErrorMessage(data.error?.code)}`)
      }
    } catch (error) {
      console.error('Error getting shared folders:', error)
      throw error
    }
  }

  // List files in a directory
  async listFiles(folderPath: string = '/'): Promise<FileInfo[]> {
    if (!this.session) throw new Error('Not authenticated')

    try {
      const fileStationApi = this.apiInfo['SYNO.FileStation.List']
      if (!fileStationApi) {
        throw new Error('FileStation.List API not available')
      }

      console.log(`Listing files in: ${folderPath}`)

      const params = new URLSearchParams({
        api: 'SYNO.FileStation.List',
        version: fileStationApi.maxVersion.toString(),
        method: 'list',
        folder_path: folderPath,
        _sid: this.session.sid,
        additional: 'real_path,size,time,perm,type',
        sort_by: 'name',
        sort_direction: 'asc',
      })

      const response = await (window as any).electronAPI.fetch(
        `${this.baseUrl}/webapi/${fileStationApi.path}?${params}`,
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('List files response:', data)

      if (data.success) {
        const files = data.data?.files || []
        console.log(`Found ${files.length} files in ${folderPath}`)
        return files
      } else {
        const errorMsg = this.getErrorMessage(data.error?.code)
        console.error('List files API error:', data.error)
        throw new Error(`Failed to list files: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Error listing files:', error)
      throw error
    }
  }

  // Get system information
  async getSystemInfo(): Promise<SystemInfo> {
    if (!this.session) throw new Error('Not authenticated')

    try {
      // Get CPU and memory info
      const systemApi = this.apiInfo['SYNO.Core.System.Utilization']
      const params = new URLSearchParams({
        api: 'SYNO.Core.System.Utilization',
        version: '1',
        method: 'get',
        _sid: this.session.sid,
      })

      const response = await (window as any).electronAPI.fetch(
        `${this.baseUrl}/webapi/entry.cgi?${params}`,
      )
      const data = await response.json()

      if (data.success) {
        const utilization = data.data
        return {
          cpu_usage: utilization.cpu?.user_load || 0,
          memory_usage:
            ((utilization.memory?.real_usage || 0) / (utilization.memory?.total || 1)) * 100,
          disk_usage: 0, // Will be calculated from volumes
          network_usage: (utilization.network?.[0]?.tx || 0) + (utilization.network?.[0]?.rx || 0),
          temperature: utilization.temperature?.cpu || 0,
          uptime: utilization.uptime || 0,
        }
      } else {
        // Fallback with simulated data if API not available
        return {
          cpu_usage: Math.random() * 100,
          memory_usage: Math.random() * 100,
          disk_usage: Math.random() * 100,
          network_usage: Math.random() * 100,
          temperature: 45 + Math.random() * 20,
          uptime: Date.now() / 1000,
        }
      }
    } catch (error) {
      console.error('Error getting system info:', error)
      // Return simulated data on error
      return {
        cpu_usage: Math.random() * 100,
        memory_usage: Math.random() * 100,
        disk_usage: Math.random() * 100,
        network_usage: Math.random() * 100,
        temperature: 45 + Math.random() * 20,
        uptime: Date.now() / 1000,
      }
    }
  }

  // Get volume information
  async getVolumeInfo(): Promise<VolumeInfo[]> {
    if (!this.session) throw new Error('Not authenticated')

    try {
      const storageApi = this.apiInfo['SYNO.Storage.CGI.Storage']
      const params = new URLSearchParams({
        api: 'SYNO.Storage.CGI.Storage',
        version: '1',
        method: 'load_info',
        _sid: this.session.sid,
      })

      const response = await (window as any).electronAPI.fetch(
        `${this.baseUrl}/webapi/entry.cgi?${params}`,
      )
      const data = await response.json()

      if (data.success && data.data.volumes) {
        return data.data.volumes.map((vol: any) => ({
          id: vol.id,
          desc: vol.display_name || vol.id,
          total_space: vol.size?.total || 0,
          used_space: vol.size?.used || 0,
          free_space: vol.size?.free || 0,
          status: vol.status || 'normal',
        }))
      } else {
        // Fallback with simulated volume data
        return [
          {
            id: 'volume_1',
            desc: 'Volume 1',
            total_space: 8000 * 1024 * 1024 * 1024, // 8TB in bytes
            used_space: 4200 * 1024 * 1024 * 1024, // 4.2TB in bytes
            free_space: 3800 * 1024 * 1024 * 1024, // 3.8TB in bytes
            status: 'normal',
          },
        ]
      }
    } catch (error) {
      console.error('Error getting volume info:', error)
      // Return simulated data on error
      return [
        {
          id: 'volume_1',
          desc: 'Volume 1',
          total_space: 8000 * 1024 * 1024 * 1024,
          used_space: 4200 * 1024 * 1024 * 1024,
          free_space: 3800 * 1024 * 1024 * 1024,
          status: 'normal',
        },
      ]
    }
  }

  // Download file
  async downloadFile(filePath: string): Promise<string> {
    if (!this.session) throw new Error('Not authenticated')

    try {
      const downloadApi = this.apiInfo['SYNO.FileStation.Download']
      if (!downloadApi) {
        throw new Error('Download API not available')
      }

      const params = new URLSearchParams({
        api: 'SYNO.FileStation.Download',
        version: downloadApi.maxVersion.toString(),
        method: 'download',
        path: filePath,
        mode: 'download',
        _sid: this.session.sid,
      })

      const downloadUrl = `${this.baseUrl}/webapi/${downloadApi.path}?${params}`
      console.log('Download URL:', downloadUrl)

      // Si on est dans Electron, utiliser l'API Electron pour télécharger
      if ((window as any).electronAPI) {
        try {
          // Déclencher le téléchargement via Electron
          const fileName = filePath.split('/').pop() || 'download'
          await (window as any).electronAPI.downloadFile?.(downloadUrl, fileName)
          return 'Downloaded via Electron'
        } catch (electronError) {
          console.warn('Electron download failed, falling back to URL:', electronError)
        }
      }

      return downloadUrl
    } catch (error) {
      console.error('Error preparing download:', error)
      throw error
    }
  }

  // Get image preview URL
  async getImagePreviewUrl(filePath: string): Promise<string> {
    if (!this.session) throw new Error('Not authenticated')

    try {
      // Utiliser l'API de téléchargement directement pour les images
      const downloadApi = this.apiInfo['SYNO.FileStation.Download']
      if (!downloadApi) {
        throw new Error('Download API not available')
      }

      const params = new URLSearchParams({
        api: 'SYNO.FileStation.Download',
        version: downloadApi.maxVersion.toString(),
        method: 'download',
        path: filePath,
        mode: 'download',
        _sid: this.session.sid,
      })

      const imageUrl = `${this.baseUrl}/webapi/${downloadApi.path}?${params}`
      console.log('Image preview URL:', imageUrl)

      return imageUrl
    } catch (error) {
      console.error('Error generating image preview URL:', error)
      throw error
    }
  }

  // Get current session info
  getSession(): SynologySession | null {
    return this.session
  }

  // Error code mapping
  private getErrorMessage(code: number): string {
    const errorCodes: { [key: number]: string } = {
      100: 'Unknown error',
      101: 'Invalid parameter',
      102: 'The requested API does not exist',
      103: 'The requested method does not exist',
      104: 'The requested version does not support the functionality',
      105: 'The logged in session does not have permission',
      106: 'Session timeout',
      107: 'Session interrupted by duplicate login',
      400: 'Invalid username or password',
      401: 'Guest account disabled',
      402: 'Account disabled',
      403: 'Wrong username or password',
      404: 'Permission denied',
      406: 'OTP code required',
      407: 'Max tries (if auto blocking is set to true)',
      408: 'Password expired cannot change',
      409: 'Password expired must change',
      410: 'Password simple must change',
    }

    return errorCodes[code] || `Unknown error code: ${code}`
  }
}

export default SynologyApiService
export type { FileInfo, ShareInfo, SynologyCredentials, SynologySession, SystemInfo, VolumeInfo }
