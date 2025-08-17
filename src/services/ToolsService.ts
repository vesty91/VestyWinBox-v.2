export interface Tool {
  id: string
  title: string
  version?: string
  size?: string
  description: string
  category: string
  status: 'available' | 'installing' | 'installed' | 'launch' | 'info'
  iconPath?: string
  downloadUrl?: string
  installPath?: string
  executablePath?: string
  tags: string[]
  rating?: number
  downloads?: number
  lastUpdated?: string
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  count: number
}

class ToolsService {
  private softwareList: Tool[] = []
  private portableAppsList: Tool[] = []
  private categories: Category[] = []
  private portableRootDir: string | null = null

  constructor() {
    this.initializeData()
  }

  private static normalizeAssetPath(p: string | undefined): string | undefined {
    if (!p) return p
    if (p.startsWith('file://')) return p
    // ensure starts with assets/ without leading slash and encode URI components after assets/
    const trimmed = p.replace(/^\/+/, '').replace(/^assets\//, '').replace(/\\/g, '/').replace(/\s+/g, ' ')
    // split and encode each segment except file scheme
    const parts = trimmed.split('/')
    const encoded = parts.map((seg) => encodeURIComponent(seg)).join('/')
    return `assets/${encoded}`
  }

  private initializeData() {
    // Initialisation des catégories
    this.categories = [
      { id: 'navigateurs', name: 'Navigateurs', icon: '🌐', color: '#3B82F6', count: 0 },
      {
        id: 'outils-systeme-monitoring-materiel',
        name: 'Outils système & Monitoring matériel',
        icon: '⚙️',
        color: '#6B7280',
        count: 0,
      },
      {
        id: 'compression-archivage',
        name: 'Compression & Archivage',
        icon: '📦',
        color: '#84CC16',
        count: 0,
      },
      { id: 'communication', name: 'Communication', icon: '💬', color: '#10B981', count: 0 },
      {
        id: 'editeurs-code-developpement',
        name: 'Éditeurs de code & Développement',
        icon: '💻',
        color: '#06B6D4',
        count: 0,
      },
      {
        id: 'maintenance-utilitaires-windows',
        name: 'Maintenance & Utilitaires Windows',
        icon: '🛠️',
        color: '#8B5CF6',
        count: 0,
      },
      {
        id: 'outils-verification-hash',
        name: 'Outils de vérification & hash',
        icon: '🔍',
        color: '#F59E0B',
        count: 0,
      },
      { id: 'internet', name: 'Internet', icon: '🌐', color: '#3B82F6', count: 0 },
      { id: 'bureautique-pdf', name: 'Bureautique & PDF', icon: '📄', color: '#10B981', count: 0 },
      {
        id: 'graphisme-multimedia',
        name: 'Graphisme & Multimédia',
        icon: '🎨',
        color: '#EC4899',
        count: 0,
      },
      {
        id: 'gestion-fichiers-compression',
        name: 'Gestion de fichiers & Compression',
        icon: '📁',
        color: '#84CC16',
        count: 0,
      },
      {
        id: 'maintenance-systeme',
        name: 'Maintenance système',
        icon: '🔧',
        color: '#6B7280',
        count: 0,
      },
      { id: 'securite', name: 'Sécurité', icon: '🔒', color: '#EF4444', count: 0 },
      {
        id: 'utilitaires-divers',
        name: 'Utilitaires & Divers',
        icon: '🛠️',
        color: '#8B5CF6',
        count: 0,
      },
    ]

    // Initialisation des logiciels
    this.softwareList = [
      // Navigateurs
      {
        id: 'chrome',
        title: 'Google Chrome',
        version: '119.0.6045.105',
        size: '85.2 MB',
        description:
          'Navigateur web rapide et sécurisé de Google avec synchronisation des données.',
        category: 'navigateurs',
        status: 'available',
        iconPath: '/assets/icons/navigateurs/Chrome.ico',
        downloadUrl: 'https://dl.google.com/chrome/install/latest/chrome_installer.exe',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/navigateurs/Chrome.exe',
        tags: ['navigateur', 'google', 'web', 'synchronisation'],
        rating: 4.8,
        downloads: 1500000,
      },
      {
        id: 'firefox',
        title: 'Mozilla Firefox',
        version: '119.0.3',
        size: '67.8 MB',
        description: 'Navigateur web open source respectueux de la vie privée.',
        category: 'navigateurs',
        status: 'available',
        iconPath: '/assets/icons/navigateurs/Firefox.ico',
        downloadUrl: 'https://download.mozilla.org/?product=firefox-latest&os=win&lang=fr',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/navigateurs/Firefox.exe',
        tags: ['navigateur', 'open source', 'privacy', 'mozilla'],
        rating: 4.6,
        downloads: 890000,
      },
      {
        id: 'opera',
        title: 'Opera Browser',
        version: '104.0.4944.84',
        size: '78.5 MB',
        description: 'Navigateur web avec VPN intégré et mode économie de batterie.',
        category: 'navigateurs',
        status: 'available',
        iconPath: '/assets/icons/navigateurs/Opera.ico',
        downloadUrl: 'https://net.geo.opera.com/opera/stable/windows',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/navigateurs/Opera.exe',
        tags: ['navigateur', 'vpn', 'batterie', 'opera'],
        rating: 4.5,
        downloads: 650000,
      },
      {
        id: 'brave',
        title: 'Brave Browser',
        version: '1.60.97',
        size: '156.7 MB',
        description:
          'Navigateur web axé sur la confidentialité avec protection contre les trackers.',
        category: 'navigateurs',
        status: 'available',
        iconPath: '/assets/icons/navigateurs/Brave.ico',
        downloadUrl: 'https://laptop-updates.brave.com/latest/winx64',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/navigateurs/Brave.exe',
        tags: ['navigateur', 'privacy', 'blocker', 'brave'],
        rating: 4.7,
        downloads: 420000,
      },

      // Outils système & Monitoring matériel
      {
        id: 'cpuz',
        title: 'CPU-Z',
        version: '2.05',
        size: '12.3 MB',
        description: 'Informations détaillées sur le processeur et la carte mère.',
        category: 'outils-systeme-monitoring-materiel',
        status: 'available',
        iconPath: '/assets/icons/Outils système & Monitoring matériel/cpu-z.ico',
        downloadUrl: 'https://download.cpuid.com/cpu-z/cpu-z_2.05-en.exe',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Outils système & Monitoring matériel/cpu-z.exe',
        tags: ['systeme', 'cpu', 'diagnostic', 'hardware'],
        rating: 4.8,
        downloads: 1800000,
      },
      {
        id: 'hwinfo',
        title: 'HWiNFO',
        version: '8.28',
        size: '14.2 MB',
        description: 'Analyseur système complet pour le matériel informatique.',
        category: 'outils-systeme-monitoring-materiel',
        status: 'available',
        iconPath: '/assets/icons/Outils système & Monitoring matériel/hwinfo.ico',
        downloadUrl: 'https://www.hwinfo.com/files/hwi_828.exe',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Outils systeme & Monitoring materiel/HWiNFO 8.28.exe',
        tags: ['systeme', 'hardware', 'analyse', 'monitoring'],
        rating: 4.9,
        downloads: 950000,
      },
      {
        id: 'aida64',
        title: 'AIDA64',
        version: '7.3.6400',
        size: '69.5 MB',
        description: 'Suite de diagnostic système et de benchmarking avancée.',
        category: 'outils-systeme-monitoring-materiel',
        status: 'available',
        iconPath: '/assets/icons/Outils système & Monitoring matériel/AIDA.64.ico',
        downloadUrl: 'https://download.aida64.com/aida64extreme730.exe',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Outils systeme & Monitoring materiel/AIDA.64.exe',
        tags: ['systeme', 'benchmark', 'diagnostic', 'hardware'],
        rating: 4.8,
        downloads: 750000,
      },
      {
        id: 'crystaldiskinfo',
        title: 'CrystalDiskInfo',
        version: '9.2.1',
        size: '8.9 MB',
        description: 'Surveillance de la santé des disques durs et SSD.',
        category: 'outils-systeme-monitoring-materiel',
        status: 'available',
        iconPath: '/assets/icons/Outils système & Monitoring matériel/crystaldiskinfo.ico',
        downloadUrl: 'https://crystalmark.info/download/zz/CrystalDiskInfo9_2_1.exe',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Outils systeme & Monitoring materiel/crystaldiskinfo/DiskInfo64.exe',
        tags: ['systeme', 'disque', 'ssd', 'sante'],
        rating: 4.7,
        downloads: 1200000,
      },
      {
        id: 'crystaldiskmark',
        title: 'CrystalDiskMark',
        version: '8.0.4',
        size: '15.6 MB',
        description: 'Test de performance des disques durs et SSD.',
        category: 'outils-systeme-monitoring-materiel',
        status: 'available',
        iconPath: '/assets/icons/Outils système & Monitoring matériel/crystaldiskmark.ico',
        downloadUrl: 'https://crystalmark.info/download/zz/CrystalDiskMark8_0_4.exe',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Outils systeme & Monitoring materiel/CrystalDiskMark/DiskMarkX64.exe',
        tags: ['systeme', 'benchmark', 'disque', 'performance'],
        rating: 4.8,
        downloads: 980000,
      },
      {
        id: 'msi-afterburner',
        title: 'MSI Afterburner',
        version: '4.6.5',
        size: '53.2 MB',
        description: 'Overclocking et surveillance des cartes graphiques.',
        category: 'outils-systeme-monitoring-materiel',
        status: 'available',
        iconPath: '/assets/icons/Outils système & Monitoring matériel/MSI.Afterburner.ico',
        downloadUrl: 'https://download.msi.com/uti_exe/vga/MSIAfterburnerSetup.zip',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Outils systeme & Monitoring materiel/MSI.Afterburner.exe',
        tags: ['systeme', 'gpu', 'overclocking', 'msi'],
        rating: 4.6,
        downloads: 850000,
      },
      {
        id: 'hd-tune',
        title: 'HD Tune',
        version: '5.75',
        size: '3.5 MB',
        description: 'Test de performance et diagnostic des disques durs.',
        category: 'outils-systeme-monitoring-materiel',
        status: 'available',
        iconPath: '/assets/icons/Outils système & Monitoring matériel/HD.Tune.ico',
        downloadUrl: 'https://www.hdtune.com/download.html',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Outils systeme & Monitoring materiel/HD.Tune.exe',
        tags: ['systeme', 'disque', 'test', 'performance'],
        rating: 4.5,
        downloads: 650000,
      },
      {
        id: 'hard-disk-sentinel',
        title: 'Hard Disk Sentinel',
        version: '6.10',
        size: '27.8 MB',
        description: 'Surveillance avancée de la santé des disques durs.',
        category: 'outils-systeme-monitoring-materiel',
        status: 'available',
        iconPath: '/assets/icons/Outils système & Monitoring matériel/Hard.Disk.Sentinel.ico',
        downloadUrl: 'https://www.hdsentinel.com/hard_disk_sentinel_trial_setup.exe',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Outils systeme & Monitoring materiel/Hard.Disk.Sentinel.exe',
        tags: ['systeme', 'disque', 'surveillance', 'sante'],
        rating: 4.7,
        downloads: 420000,
      },
      {
        id: 'burn-in-test',
        title: 'BurnInTest',
        version: '10.2',
        size: '45.6 MB',
        description: 'Test de stress et de stabilité du système.',
        category: 'outils-systeme-monitoring-materiel',
        status: 'available',
        iconPath: '/assets/icons/Outils système & Monitoring matériel/Burn.In.Test.ico',
        downloadUrl: 'https://www.passmark.com/download/bit_download.htm',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Outils systeme & Monitoring materiel/Burn.In.Test.exe',
        tags: ['systeme', 'test', 'stress', 'stabilite'],
        rating: 4.6,
        downloads: 380000,
      },
      {
        id: 'occt',
        title: 'OCCT',
        version: '11.2.8',
        size: '82.3 MB',
        description: 'Test de stress CPU et GPU pour overclocking.',
        category: 'outils-systeme-monitoring-materiel',
        status: 'available',
        iconPath: '/assets/icons/Outils système & Monitoring matériel/O.C.C.T.ico',
        downloadUrl: 'https://www.ocbase.com/download',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Outils systeme & Monitoring materiel/O.C.C.T.exe',
        tags: ['systeme', 'stress', 'overclocking', 'cpu'],
        rating: 4.7,
        downloads: 520000,
      },
      {
        id: 'performance-test',
        title: 'PerformanceTest',
        version: '11.0',
        size: '56.7 MB',
        description: 'Benchmark complet du système informatique.',
        category: 'outils-systeme-monitoring-materiel',
        status: 'available',
        iconPath: '/assets/icons/Outils système & Monitoring matériel/Performance.Test.ico',
        downloadUrl: 'https://www.passmark.com/download/pt_download.htm',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Outils systeme & Monitoring materiel/Performance.Test.exe',
        tags: ['systeme', 'benchmark', 'performance', 'test'],
        rating: 4.8,
        downloads: 680000,
      },

      // Compression & Archivage
      {
        id: '7zip',
        title: '7-Zip',
        version: '23.01',
        size: '1.5 MB',
        description: 'Compresseur de fichiers open source avec taux de compression élevé.',
        category: 'compression-archivage',
        status: 'available',
        iconPath: '/assets/icons/Compression & Archivage/7zip.ico',
        downloadUrl: 'https://www.7-zip.org/a/7z2301-x64.exe',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Compression & Archivage/7zip.exe',
        tags: ['compression', 'archive', 'open source', '7z', 'zip'],
        rating: 4.9,
        downloads: 1800000,
      },
      {
        id: 'winrar',
        title: 'WinRAR',
        version: '6.24',
        size: '3.5 MB',
        description: 'Compresseur de fichiers populaire avec interface graphique.',
        category: 'compression-archivage',
        status: 'available',
        iconPath: '/assets/icons/Compression & Archivage/winrar.ico',
        downloadUrl: 'https://www.win-rar.com/download.html',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Compression & Archivage/WinRAR1.exe',
        tags: ['compression', 'archive', 'rar', 'zip'],
        rating: 4.7,
        downloads: 2100000,
      },

      // Communication
      {
        id: 'whatsapp',
        title: 'WhatsApp Desktop',
        version: '2.2408.6',
        size: '156.7 MB',
        description: 'Application de messagerie instantanée pour ordinateur.',
        category: 'communication',
        status: 'available',
        iconPath: '/assets/icons/Communication/WhatsApp.ico',
        downloadUrl: 'https://web.whatsapp.com/desktop/windows/release/x64/WhatsAppSetup.exe',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Communication/WhatsApp.exe',
        tags: ['communication', 'messagerie', 'whatsapp', 'chat'],
        rating: 4.5,
        downloads: 890000,
      },

      // Éditeurs de code & Développement
      {
        id: 'git',
        title: 'Git',
        version: '2.50.0',
        size: '68.5 MB',
        description: 'Système de contrôle de version distribué.',
        category: 'editeurs-code-developpement',
        status: 'available',
        iconPath: '/assets/icons/Éditeurs de code & Développement/Git-2.50.0-64-bit.ico',
        downloadUrl:
          'https://github.com/git-for-windows/git/releases/download/v2.50.0.windows.1/Git-2.50.0-64-bit.exe',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Editeurs de code & Developpement/Git-2.50.0-64-bit.exe',
        tags: ['developpement', 'version', 'git', 'controle'],
        rating: 4.9,
        downloads: 2500000,
      },
      {
        id: 'nodejs',
        title: 'Node.js',
        version: '20.10.0',
        size: '25.8 MB',
        description: 'Runtime JavaScript pour le développement côté serveur.',
        category: 'editeurs-code-developpement',
        status: 'available',
        iconPath: '/assets/icons/Éditeurs de code & Développement/NodeJS.ico',
        downloadUrl: 'https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Editeurs de code & Developpement/NodeJS.msi',
        tags: ['developpement', 'javascript', 'node', 'runtime'],
        rating: 4.8,
        downloads: 1800000,
      },

      // Maintenance & Utilitaires Windows
      {
        id: 'driver-booster',
        title: 'Driver Booster',
        version: '11.5.0',
        size: '25.6 MB',
        description: 'Mise à jour automatique des pilotes système.',
        category: 'maintenance-utilitaires-windows',
        status: 'available',
        iconPath: '/assets/icons/Maintenance & Utilitaires Windows/Driver Booster.ico',
        downloadUrl: 'https://cdn.iobit.com/dl/driver_booster_setup.exe',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Maintenance & Utilitaires Windows/Driver Booster.exe',
        tags: ['utilitaires', 'pilotes', 'mise-a-jour', 'systeme'],
        rating: 4.6,
        downloads: 1200000,
      },
      {
        id: 'uninstaller',
        title: 'Uninstaller',
        version: '4.5.0',
        size: '25.3 MB',
        description: 'Désinstalleur avancé avec nettoyage des résidus.',
        category: 'maintenance-utilitaires-windows',
        status: 'available',
        iconPath: '/assets/icons/Maintenance & Utilitaires Windows/Uninstaller.png',
        downloadUrl: 'https://www.revouninstaller.com/download/',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Maintenance & Utilitaires Windows/Uninstaller.exe',
        tags: ['utilitaires', 'desinstallation', 'nettoyage', 'systeme'],
        rating: 4.7,
        downloads: 850000,
      },
      {
        id: 'produkey',
        title: 'ProduKey',
        version: '1.97',
        size: '2.8 MB',
        description: 'Récupération des clés de produit Windows et Office.',
        category: 'maintenance-utilitaires-windows',
        status: 'available',
        iconPath: '/assets/icons/Maintenance & Utilitaires Windows/produkey.ico',
        downloadUrl: 'https://www.nirsoft.net/utils/product_cd_key_viewer.html',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Maintenance & Utilitaires Windows/produkey/produkey.exe',
        tags: ['utilitaires', 'cles', 'windows', 'office'],
        rating: 4.5,
        downloads: 650000,
      },

      // Outils de vérification & hash
      {
        id: 'hash-check',
        title: 'Hash Check',
        version: '2.4.0',
        size: '497 KB',
        description: "Vérification d'intégrité des fichiers par hash.",
        category: 'outils-verification-hash',
        status: 'available',
        iconPath: '/assets/icons/Outils de vérification & hash/Hash.Check.ico',
        downloadUrl: 'https://www.irnis.net/software/hashcheck/',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Outils de verification & hash/Hash.Check.exe',
        tags: ['utilitaires', 'hash', 'verification', 'integrite'],
        rating: 4.6,
        downloads: 420000,
      },
      {
        id: 'hash-tab',
        title: 'HashTab',
        version: '6.0.0.34',
        size: '1.1 MB',
        description: "Extension pour calculer les hash dans l'explorateur Windows.",
        category: 'outils-verification-hash',
        status: 'available',
        iconPath: '/assets/icons/Outils de vérification & hash/Hash.Tab.ico',
        downloadUrl: 'https://hashtab.en.softonic.com/',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/logiciels/Outils de verification & hash/Hash.Tab.exe',
        tags: ['utilitaires', 'hash', 'explorateur', 'verification'],
        rating: 4.5,
        downloads: 380000,
      },
    ]

    // Initialisation des apps portables
    this.portableAppsList = [
      // Internet
      {
        id: 'googlechrome-portable',
        title: 'Google Chrome Portable',
        version: '119.0.6045.105',
        size: '125.3 MB',
        description: 'Navigateur web portable de Google avec synchronisation.',
        category: 'internet',
        status: 'launch',
        iconPath: '/assets/icons/Internet/google.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Internet/GoogleChrome/GoogleChrome.exe',
        tags: ['portable', 'navigateur', 'chrome', 'internet'],
        rating: 4.7,
        downloads: 450000,
      },
      {
        id: 'firefox-portable',
        title: 'Mozilla Firefox Portable',
        version: '119.0.3',
        size: '89.2 MB',
        description: 'Navigateur web portable open source respectueux de la vie privée.',
        category: 'internet',
        status: 'launch',
        iconPath: '/assets/icons/Internet/firefox.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Internet/FirefoxPortable/App/Firefox64/firefox.exe',
        tags: ['portable', 'navigateur', 'firefox', 'internet'],
        rating: 4.6,
        downloads: 320000,
      },
      {
        id: 'qbittorrent-portable',
        title: 'qBittorrent Portable',
        version: '4.6.2',
        size: '45.8 MB',
        description: 'Client BitTorrent portable open source.',
        category: 'internet',
        status: 'launch',
        iconPath: '/assets/icons/Internet/qBittorrent.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Internet/qBittorrentPortable/qBittorrent.exe',
        tags: ['portable', 'torrent', 'download', 'internet'],
        rating: 4.8,
        downloads: 280000,
      },
      {
        id: 'filezilla-portable',
        title: 'FileZilla Portable',
        version: '3.66.0',
        size: '12.4 MB',
        description: 'Client FTP portable pour transfert de fichiers.',
        category: 'internet',
        status: 'launch',
        iconPath: '/assets/icons/Internet/filezilla.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Internet/FileZillaPortable/FileZilla.exe',
        tags: ['portable', 'ftp', 'transfert', 'internet'],
        rating: 4.5,
        downloads: 180000,
      },

      // Bureautique & PDF
      {
        id: 'sumatrapdf-portable',
        title: 'Sumatra PDF Portable',
        version: '3.5.2',
        size: '8.9 MB',
        description: 'Lecteur PDF portable léger et rapide.',
        category: 'bureautique-pdf',
        status: 'launch',
        iconPath: '/assets/icons/Bureautique & PDF/SumatraPDF.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Bureautique & PDF/SumatraPDF/SumatraPDF-3.5.2-64.exe',
        tags: ['portable', 'pdf', 'lecteur', 'bureautique'],
        rating: 4.7,
        downloads: 250000,
      },
      {
        id: 'foxitreader-portable',
        title: 'Foxit Reader Portable',
        version: '12.1.2',
        size: '156.7 MB',
        description: 'Lecteur PDF portable avec fonctionnalités avancées.',
        category: 'bureautique-pdf',
        status: 'launch',
        iconPath: '/assets/icons/Bureautique & PDF/foxitreader.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Bureautique & PDF/FoxitReaderPortable/FoxitReader.exe',
        tags: ['portable', 'pdf', 'lecteur', 'bureautique'],
        rating: 4.6,
        downloads: 190000,
      },
      {
        id: 'pdf-xchange-portable',
        title: 'PDF-XChange Editor Portable',
        version: '10.1.2',
        size: '89.3 MB',
        description: "Éditeur PDF portable avec outils d'annotation.",
        category: 'bureautique-pdf',
        status: 'launch',
        iconPath: '/assets/icons/Bureautique & PDF/pdfxchange.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Bureautique & PDF/PDF-XChangeEditorPortable/PDF-XChangeEditor.exe',
        tags: ['portable', 'pdf', 'editeur', 'bureautique'],
        rating: 4.8,
        downloads: 120000,
      },

      // Graphisme & Multimédia
      {
        id: 'vlc-portable',
        title: 'VLC Media Player Portable',
        version: '3.0.18',
        size: '78.9 MB',
        description: 'Lecteur multimédia portable polyvalent.',
        category: 'graphisme-multimedia',
        status: 'launch',
        iconPath: '/assets/icons/Graphisme & multimédia/vlc.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Graphisme & multimédia/VLCPortable/VLC.exe',
        tags: ['portable', 'multimedia', 'lecteur', 'video'],
        rating: 4.8,
        downloads: 320000,
      },
      {
        id: 'gimp-portable',
        title: 'GIMP Portable',
        version: '2.10.36',
        size: '234.5 MB',
        description: "Éditeur d'image portable open source.",
        category: 'graphisme-multimedia',
        status: 'launch',
        iconPath: '/assets/icons/Graphisme & multimédia/gimp.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Graphisme & multimédia/GIMPPortable/GIMP.exe',
        tags: ['portable', 'graphisme', 'editeur', 'image'],
        rating: 4.7,
        downloads: 180000,
      },
      {
        id: 'inkscape-portable',
        title: 'Inkscape Portable',
        version: '1.3.2',
        size: '156.8 MB',
        description: 'Éditeur de graphiques vectoriels portable.',
        category: 'graphisme-multimedia',
        status: 'launch',
        iconPath: '/assets/icons/Graphisme & multimédia/inkscape.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Graphisme & multimédia/InkscapePortable/Inkscape.exe',
        tags: ['portable', 'graphisme', 'vectoriel', 'svg'],
        rating: 4.6,
        downloads: 95000,
      },
      {
        id: 'krita-portable',
        title: 'Krita Portable',
        version: '5.2.2',
        size: '189.3 MB',
        description: 'Logiciel de peinture numérique portable.',
        category: 'graphisme-multimedia',
        status: 'launch',
        iconPath: '/assets/icons/Graphisme & multimédia/krita.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Graphisme & multimédia/KritaPortable/Krita.exe',
        tags: ['portable', 'graphisme', 'peinture', 'numerique'],
        rating: 4.8,
        downloads: 140000,
      },
      {
        id: 'paintdotnet-portable',
        title: 'Paint.NET Portable',
        version: '5.0.12',
        size: '45.2 MB',
        description: "Éditeur d'image portable simple et efficace.",
        category: 'graphisme-multimedia',
        status: 'launch',
        iconPath: '/assets/icons/Graphisme & multimédia/paintdotnet.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Graphisme & multimédia/PaintDotNetPortable/PaintDotNet.exe',
        tags: ['portable', 'graphisme', 'editeur', 'image'],
        rating: 4.5,
        downloads: 210000,
      },
      {
        id: 'audacity-portable',
        title: 'Audacity Portable',
        version: '3.4.2',
        size: '67.8 MB',
        description: 'Éditeur audio portable open source.',
        category: 'graphisme-multimedia',
        status: 'launch',
        iconPath: '/assets/icons/Graphisme & multimédia/audacity.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Graphisme & multimédia/AudacityPortable/Audacity.exe',
        tags: ['portable', 'audio', 'editeur', 'multimedia'],
        rating: 4.7,
        downloads: 280000,
      },

      // Gestion de fichiers & Compression
      {
        id: '7zip-portable',
        title: '7-Zip Portable',
        version: '23.01',
        size: '1.5 MB',
        description: 'Compresseur de fichiers portable open source.',
        category: 'gestion-fichiers-compression',
        status: 'launch',
        iconPath: '/assets/icons/Gestion de fichiers & compression/7zip.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Gestion de fichiers & compression/7-ZipPortable/7-Zip.exe',
        tags: ['portable', 'compression', 'archive', '7z'],
        rating: 4.9,
        downloads: 180000,
      },
      {
        id: 'freecommander-portable',
        title: 'FreeCommander Portable',
        version: '2023 Build 880',
        size: '34.7 MB',
        description: 'Gestionnaire de fichiers portable avec double panneau.',
        category: 'gestion-fichiers-compression',
        status: 'launch',
        iconPath: '/assets/icons/Gestion de fichiers & compression/freecommander.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Gestion de fichiers & compression/FreeCommanderPortable/FreeCommander.exe',
        tags: ['portable', 'fichiers', 'gestionnaire', 'explorateur'],
        rating: 4.7,
        downloads: 160000,
      },
      {
        id: 'qdir-portable',
        title: 'Q-Dir Portable',
        version: '10.85',
        size: '2.8 MB',
        description: 'Explorateur de fichiers portable avec 4 panneaux.',
        category: 'gestion-fichiers-compression',
        status: 'launch',
        iconPath: '/assets/icons/Gestion de fichiers & compression/qdir.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Gestion de fichiers & compression/Q-DirPortable/Q-Dir.exe',
        tags: ['portable', 'fichiers', 'explorateur', 'quadri'],
        rating: 4.5,
        downloads: 85000,
      },
      {
        id: 'explorerpp-portable',
        title: 'Explorer++ Portable',
        version: '1.4.0',
        size: '1.2 MB',
        description: 'Explorateur de fichiers portable léger.',
        category: 'gestion-fichiers-compression',
        status: 'launch',
        iconPath: '/assets/icons/Gestion de fichiers & compression/explorer++.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Gestion de fichiers & compression/Explorer++Portable/Explorer++.exe',
        tags: ['portable', 'fichiers', 'explorateur', 'leger'],
        rating: 4.4,
        downloads: 65000,
      },
      {
        id: 'everything-portable',
        title: 'Everything Portable',
        version: '1.4.1.1024',
        size: '1.8 MB',
        description: 'Moteur de recherche de fichiers ultra-rapide.',
        category: 'gestion-fichiers-compression',
        status: 'launch',
        iconPath: '/assets/icons/Gestion de fichiers & compression/everything.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Gestion de fichiers & compression/EverythingPortable/Everything.exe',
        tags: ['portable', 'recherche', 'fichiers', 'rapide'],
        rating: 4.9,
        downloads: 220000,
      },

      // Maintenance système
      {
        id: 'cpuz-portable',
        title: 'CPU-Z Portable',
        version: '2.05',
        size: '12.3 MB',
        description: 'Informations détaillées sur le processeur et la carte mère.',
        category: 'maintenance-systeme',
        status: 'launch',
        iconPath: '/assets/icons/Maintenance système/cpuz.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Maintenance système/CPU-ZPortable/CPU-Z.exe',
        tags: ['portable', 'systeme', 'cpu', 'diagnostic'],
        rating: 4.8,
        downloads: 180000,
      },
      {
        id: 'gpuz-portable',
        title: 'GPU-Z Portable',
        version: '2.51.0',
        size: '8.9 MB',
        description: 'Informations détaillées sur la carte graphique.',
        category: 'maintenance-systeme',
        status: 'launch',
        iconPath: '/assets/icons/Maintenance système/gpuz.png',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Maintenance système/GPU-ZPortable/GPU-Z.exe',
        tags: ['portable', 'systeme', 'gpu', 'diagnostic'],
        rating: 4.7,
        downloads: 150000,
      },
      {
        id: 'hwmonitor-portable',
        title: 'HWMonitor Portable',
        version: '1.52',
        size: '15.6 MB',
        description: 'Surveillance des températures et tensions du système.',
        category: 'maintenance-systeme',
        status: 'launch',
        iconPath: '/assets/icons/Maintenance système/hwmonitor.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Maintenance système/HWMonitorPortable/HWMonitor.exe',
        tags: ['portable', 'systeme', 'temperature', 'surveillance'],
        rating: 4.6,
        downloads: 120000,
      },
      {
        id: 'processexplorer-portable',
        title: 'Process Explorer Portable',
        version: '17.05',
        size: '2.1 MB',
        description: 'Gestionnaire de processus avancé de Microsoft.',
        category: 'maintenance-systeme',
        status: 'launch',
        iconPath: '/assets/icons/Maintenance système/processexplorer.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Maintenance système/ProcessExplorerPortable/ProcessExplorer.exe',
        tags: ['portable', 'systeme', 'processus', 'microsoft'],
        rating: 4.8,
        downloads: 200000,
      },
      {
        id: 'revouninstaller-portable',
        title: 'Revo Uninstaller Portable',
        version: '2.4.5',
        size: '23.8 MB',
        description: 'Désinstalleur avancé avec nettoyage des résidus.',
        category: 'maintenance-systeme',
        status: 'launch',
        iconPath: '/assets/icons/Maintenance système/revouninstaller.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Maintenance système/RevoUninstallerPortable/RevoUninstaller.exe',
        tags: ['portable', 'desinstallation', 'nettoyage', 'systeme'],
        rating: 4.7,
        downloads: 160000,
      },
      {
        id: 'specportable',
        title: 'SPEC Portable',
        version: '1.0',
        size: '5.2 MB',
        description: 'Outil de diagnostic système portable.',
        category: 'maintenance-systeme',
        status: 'launch',
        iconPath: '/assets/icons/Maintenance système/spec.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Maintenance système/specPortable/spec.exe',
        tags: ['portable', 'systeme', 'diagnostic', 'spec'],
        rating: 4.5,
        downloads: 45000,
      },

      // Sécurité
      {
        id: 'malwarebytes-portable',
        title: 'Malwarebytes Portable',
        version: '4.6.1',
        size: '156.7 MB',
        description: 'Scanner anti-malware portable.',
        category: 'securite',
        status: 'launch',
        iconPath: '/assets/icons/securite/malwarebytes.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/securite/malwarebytes/Malwarebytes.exe',
        tags: ['portable', 'securite', 'antimalware', 'scan'],
        rating: 4.5,
        downloads: 120000,
      },
      {
        id: 'autoruns-portable',
        title: 'Autoruns Portable',
        version: '14.10',
        size: '1.7 MB',
        description: 'Gestionnaire des programmes au démarrage.',
        category: 'securite',
        status: 'launch',
        iconPath: '/assets/icons/securite/autoruns.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/securite/autoruns.exe',
        tags: ['portable', 'securite', 'demarrage', 'microsoft'],
        rating: 4.6,
        downloads: 85000,
      },
      {
        id: 'procexp-portable',
        title: 'Process Explorer Portable',
        version: '17.05',
        size: '4.3 MB',
        description: 'Gestionnaire de processus avancé.',
        category: 'securite',
        status: 'launch',
        iconPath: '/assets/icons/securite/procexp.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/securite/procexp.exe',
        tags: ['portable', 'securite', 'processus', 'microsoft'],
        rating: 4.8,
        downloads: 95000,
      },
      {
        id: 'windows-firewall-control-portable',
        title: 'Windows Firewall Control',
        version: '6.9.2.0',
        size: '2.3 MB',
        description: 'Contrôle avancé du pare-feu Windows.',
        category: 'securite',
        status: 'launch',
        iconPath: '/assets/icons/securite/wfc.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/securite/Windows.Firewall.Control.exe',
        tags: ['portable', 'securite', 'pare-feu', 'windows'],
        rating: 4.7,
        downloads: 75000,
      },

      // Utilitaires & Divers
      {
        id: 'notepadpp-portable',
        title: 'Notepad++ Portable',
        version: '8.6.2',
        size: '12.4 MB',
        description: 'Éditeur de texte portable avec coloration syntaxique.',
        category: 'utilitaires-divers',
        status: 'launch',
        iconPath: '/assets/icons/Utilitaires & divers/notepad++.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Utilitaires & divers/Notepad++Portable/Notepad++Portable.exe',
        tags: ['portable', 'editeur', 'texte', 'syntaxe'],
        rating: 4.6,
        downloads: 280000,
      },
      {
        id: 'windirstat-portable',
        title: 'WinDirStat Portable',
        version: '1.1.2.80',
        size: '3.4 MB',
        description: "Analyseur d'utilisation d'espace disque.",
        category: 'utilitaires-divers',
        status: 'launch',
        iconPath: '/assets/icons/Utilitaires & divers/windirstat.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Utilitaires & divers/WinDirStatPortable/WinDirStatPortable.exe',
        tags: ['portable', 'disque', 'analyse', 'espace'],
        rating: 4.5,
        downloads: 110000,
      },
      {
        id: 'sharex-portable',
        title: 'ShareX Portable',
        version: '15.0.0',
        size: '23.8 MB',
        description: "Outil de capture d'écran et partage avancé.",
        category: 'utilitaires-divers',
        status: 'launch',
        iconPath: '/assets/icons/Utilitaires & divers/sharex.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Utilitaires & divers/ShareXPortable/ShareXPortable.exe',
        tags: ['portable', 'capture', 'partage', 'screenshot'],
        rating: 4.8,
        downloads: 180000,
      },
      {
        id: 'ditto-portable',
        title: 'Ditto Portable',
        version: '3.24.244.0',
        size: '8.9 MB',
        description: 'Gestionnaire de presse-papiers avancé.',
        category: 'utilitaires-divers',
        status: 'launch',
        iconPath: '/assets/icons/Utilitaires & divers/ditto.ico',
        executablePath:
          'C:/Users/vesty/Desktop/Nouveau dossier (6)/assets/Apps portable/Utilitaires & divers/DittoPortable/DittoPortable.exe',
        tags: ['portable', 'presse-papiers', 'copier', 'coller'],
        rating: 4.7,
        downloads: 140000,
      },
    ]

    // Mise à jour des compteurs de catégories
    this.updateCategoryCounts()
  }

  private updateCategoryCounts() {
    this.categories.forEach((category) => {
      const softwareCount = this.softwareList.filter((tool) => tool.category === category.id).length
      const portableCount = this.portableAppsList.filter(
        (tool) => tool.category === category.id,
      ).length
      category.count = softwareCount + portableCount
    })
  }

  private async ensurePortableRootLoaded(): Promise<void> {
    try {
      if (this.portableRootDir !== null) return
      if (window.electronAPI && (window.electronAPI as any).getPortableRootDir) {
        this.portableRootDir = await window.electronAPI.getPortableRootDir()
      }
    } catch {
      this.portableRootDir = null
    }
  }

  async setPortableRoot(dir: string): Promise<boolean> {
    if (!dir) return false
    if (window.electronAPI && (window.electronAPI as any).setPortableRootDir) {
      const ok = await window.electronAPI.setPortableRootDir(dir)
      if (ok) this.portableRootDir = dir
      return ok
    }
    this.portableRootDir = dir
    return true
  }

  getPortableRoot(): string | null {
    return this.portableRootDir
  }

  // Hook: post process icon paths when returning lists
  private mapNormalizeIcons<T extends Tool>(arr: T[]): T[] {
    return arr.map((t) => ({ ...t, iconPath: ToolsService.normalizeAssetPath(t.iconPath) }))
  }

  // Méthodes principales
  async scanLogiciels(): Promise<Tool[]> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Vérification des logiciels installés via Electron API
      if (window.electronAPI) {
        const installedSoftware = await window.electronAPI.getInstalledSoftware()
        this.softwareList.forEach((software) => {
          const installed = installedSoftware.find((item: any) =>
            item.name.toLowerCase().includes(software.title.toLowerCase()),
          )
          if (installed) {
            software.status = 'installed'
            software.installPath = installed.path
          }
        })
      }

      return this.mapNormalizeIcons(this.softwareList)
    } catch (error) {
      console.error('Erreur lors du scan des logiciels:', error)
      return this.mapNormalizeIcons(this.softwareList)
    }
  }

  async scanPortableApps(): Promise<Tool[]> {
    try {
      await this.ensurePortableRootLoaded()
      // Simulation d'un scan des apps portables
      await new Promise((resolve) => setTimeout(resolve, 800))
      const basePath = this.portableRootDir || this.getBasePath()

      if (window.electronAPI) {
        const portableApps = await window.electronAPI.getPortableApps()
        this.portableAppsList.forEach((app) => {
          if (app.executablePath) {
            app.executablePath = app.executablePath.replace(
              'C:/Users/vesty/Desktop/Nouveau dossier (6)',
              basePath,
            )
          }
          const normalize = (s: string) =>
            (s || '')
              .toLowerCase()
              .normalize('NFD')
              .replace(/[^a-z0-9]+/g, '')
          const appNorm = normalize(app.title)
          const found = portableApps.find((item: any) => {
            const nameNorm = normalize(item.name)
            return appNorm.includes(nameNorm) || nameNorm.includes(appNorm)
          })
          if (found) {
            app.executablePath = found.path
            app.status = 'launch'
          } else {
            app.status = 'info'
          }
        })
      }

      return this.mapNormalizeIcons(this.portableAppsList)
    } catch (error) {
      console.error('Erreur lors du scan des apps portables:', error)
      return this.mapNormalizeIcons(this.portableAppsList)
    }
  }

  private getBasePath(): string {
    // En mode développement
    if (process.env.NODE_ENV === 'development') {
      return 'C:/Users/vesty/Desktop/Nouveau dossier (6)'
    }

    // En mode production (exécutable)
    if (window.electronAPI && (window.electronAPI as any).getAppPath) {
      return (window.electronAPI as any).getAppPath() || process.cwd()
    }

    // Fallback
    return process.cwd()
  }

  async searchTools(query: string, category?: string): Promise<Tool[]> {
    try {
      const allTools = [...this.softwareList, ...this.portableAppsList]
      let filteredTools = allTools

      // Filtrage par catégorie
      if (category && category !== 'all') {
        filteredTools = filteredTools.filter((tool) => tool.category === category)
      }

      // Recherche par texte
      if (query.trim()) {
        const searchTerm = query.toLowerCase()
        filteredTools = filteredTools.filter(
          (tool) =>
            tool.title.toLowerCase().includes(searchTerm) ||
            tool.description.toLowerCase().includes(searchTerm) ||
            tool.tags.some((tag) => tag.toLowerCase().includes(searchTerm)),
        )
      }

      return filteredTools
    } catch (error) {
      console.error('Erreur lors de la recherche:', error)
      return []
    }
  }

  getCategories(): Category[] {
    // Mise à jour des compteurs avant de retourner les catégories
    this.updateCategoryCounts()

    // Retourner toutes les catégories qui ont des logiciels (normaux ou portables)
    return this.categories.filter((category) => {
      const softwareCount = this.softwareList.filter((tool) => tool.category === category.id).length
      const portableCount = this.portableAppsList.filter(
        (tool) => tool.category === category.id,
      ).length
      return softwareCount + portableCount > 0
    })
  }

  // Méthode pour obtenir les catégories des logiciels uniquement
  getSoftwareCategories(): Category[] {
    this.categories.forEach((category) => {
      const softwareCount = this.softwareList.filter((tool) => tool.category === category.id).length
      category.count = softwareCount
    })

    return this.categories
      .filter((category) => category.count > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }

  // Méthode pour obtenir les catégories des applications portables uniquement
  getPortableCategories(): Category[] {
    this.categories.forEach((category) => {
      const portableCount = this.portableAppsList.filter(
        (tool) => tool.category === category.id,
      ).length
      category.count = portableCount
    })

    return this.categories
      .filter((category) => category.count > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }

  async installSoftware(toolId: string): Promise<boolean> {
    try {
      const tool = this.softwareList.find((t) => t.id === toolId)
      if (!tool) {
        throw new Error('Logiciel non trouvé')
      }

      // Mise à jour du statut
      tool.status = 'installing'

      // Installation via Electron API
      if (window.electronAPI && tool.downloadUrl) {
        const success = await window.electronAPI.installSoftware({
          url: tool.downloadUrl,
          name: tool.title,
          version: tool.version,
        })

        if (success) {
          tool.status = 'installed'
          return true
        } else {
          tool.status = 'available'
          return false
        }
      }

      // Fallback : simulation d'installation
      await new Promise((resolve) => setTimeout(resolve, 3000))
      tool.status = 'installed'
      return true
    } catch (error) {
      console.error("Erreur lors de l'installation:", error)
      const tool = this.softwareList.find((t) => t.id === toolId)
      if (tool) {
        tool.status = 'available'
      }
      return false
    }
  }

  async launchPortableApp(toolId: string): Promise<boolean> {
    try {
      const tool = this.portableAppsList.find((t) => t.id === toolId)
      if (!tool) {
        throw new Error('App portable non trouvée')
      }

      // Lancement via Electron API
      if (window.electronAPI && tool.executablePath) {
        const success = await window.electronAPI.launchApplication(tool.executablePath)
        return success
      }

      // Fallback : simulation de lancement
      return true
    } catch (error) {
      console.error('Erreur lors du lancement:', error)
      return false
    }
  }

  async uninstallSoftware(toolId: string): Promise<boolean> {
    try {
      const tool = this.softwareList.find((t) => t.id === toolId)
      if (!tool) {
        throw new Error('Logiciel non trouvé')
      }

      // Désinstallation via Electron API
      if (window.electronAPI && tool.installPath) {
        const success = await window.electronAPI.uninstallSoftware(tool.installPath)
        if (success) {
          tool.status = 'available'
          tool.installPath = undefined
          return true
        }
      }

      // Fallback : simulation de désinstallation
      await new Promise((resolve) => setTimeout(resolve, 2000))
      tool.status = 'available'
      tool.installPath = undefined
      return true
    } catch (error) {
      console.error('Erreur lors de la désinstallation:', error)
      return false
    }
  }

  getToolById(toolId: string): Tool | undefined {
    return [...this.softwareList, ...this.portableAppsList].find((t) => t.id === toolId)
  }

  getToolsByCategory(categoryId: string): Tool[] {
    return [...this.softwareList, ...this.portableAppsList].filter((t) => t.category === categoryId)
  }

  async refreshData(): Promise<void> {
    await this.scanLogiciels()
    await this.scanPortableApps()
    this.updateCategoryCounts()
  }
}

// Instance singleton
const toolsService = new ToolsService()
export default toolsService
