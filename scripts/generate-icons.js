const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

/**
 * Script pour générer toutes les tailles d'icônes nécessaires
 * Utilise ImageMagick (convert) pour convertir SVG -> ICO
 */

const SVG_PATH = path.join(__dirname, '../assets/branding/vestywinbox-icon.svg')
const OUTPUT_DIR = path.join(__dirname, '../assets/icons')
const ICO_PATH = path.join(__dirname, '../assets/icon.ico')

// Tailles d'icônes Windows standard
const ICON_SIZES = [16, 24, 32, 48, 64, 96, 128, 256, 512]

async function checkImageMagick() {
  return new Promise((resolve) => {
    exec('magick -version', (error) => {
      if (error) {
        console.log('❌ ImageMagick non trouvé. Installation requise...')
        console.log('💡 Installer avec: choco install imagemagick')
        resolve(false)
      } else {
        console.log('✅ ImageMagick détecté')
        resolve(true)
      }
    })
  })
}

async function generatePNGs() {
  console.log('🎨 Génération des PNG...')

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const promises = ICON_SIZES.map((size) => {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`)
      const command = `magick "${SVG_PATH}" -resize ${size}x${size} "${outputPath}"`

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Erreur ${size}x${size}:`, error.message)
          reject(error)
        } else {
          console.log(`✅ Généré: icon-${size}x${size}.png`)
          resolve()
        }
      })
    })
  })

  await Promise.all(promises)
}

async function generateICO() {
  console.log('🔧 Génération du fichier .ico...')

  // Construire la commande avec tous les PNG
  const pngFiles = ICON_SIZES.map(
    (size) => `"${path.join(OUTPUT_DIR, `icon-${size}x${size}.png`)}"`,
  ).join(' ')

  const command = `magick ${pngFiles} "${ICO_PATH}"`

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Erreur génération ICO:', error.message)
        reject(error)
      } else {
        console.log('✅ Fichier .ico généré avec succès !')
        console.log(`📍 Localisation: ${ICO_PATH}`)
        resolve()
      }
    })
  })
}

async function generateFallbackICO() {
  console.log('🔄 Génération ICO simplifiée...')

  // Juste convertir le SVG directement en ICO (moins de contrôle mais fonctionne)
  const command = `magick "${SVG_PATH}" -define icon:auto-resize=16,24,32,48,64,96,128,256 "${ICO_PATH}"`

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Erreur génération ICO simplifiée:', error.message)
        reject(error)
      } else {
        console.log('✅ ICO généré en mode simplifié !')
        resolve()
      }
    })
  })
}

async function manualInstructions() {
  console.log('\n🛠️ INSTRUCTIONS MANUELLES:')
  console.log('1. Installer ImageMagick:')
  console.log('   choco install imagemagick')
  console.log('   OU télécharger sur: https://imagemagick.org/script/download.php#windows')
  console.log('\n2. Redémarrer ce script après installation')
  console.log('\n3. Alternative: Utiliser un convertisseur en ligne:')
  console.log('   - Ouvrir: https://convertio.co/svg-ico/')
  console.log('   - Uploader: assets/branding/vestywinbox-icon.svg')
  console.log('   - Télécharger le .ico et le placer dans: assets/icon.ico')
}

async function main() {
  console.log("🚀 Générateur d'icônes VestyWinBox")
  console.log('=====================================\n')

  // Vérifier si le SVG existe
  if (!fs.existsSync(SVG_PATH)) {
    console.error('❌ Fichier SVG non trouvé:', SVG_PATH)
    return
  }

  // Vérifier ImageMagick
  const hasMagick = await checkImageMagick()

  if (!hasMagick) {
    await manualInstructions()
    return
  }

  try {
    // Méthode 1: Générer tous les PNG puis combiner
    await generatePNGs()
    await generateICO()

    console.log('\n🎉 SUCCÈS !')
    console.log('Icône prête pour Electron Builder !')
  } catch (error) {
    console.log('\n⚠️ Méthode 1 échouée, tentative simplifiée...')
    try {
      await generateFallbackICO()
      console.log('\n🎉 SUCCÈS (méthode simplifiée) !')
    } catch (fallbackError) {
      console.error('\n❌ Toutes les méthodes ont échoué')
      await manualInstructions()
    }
  }
}

// Exécuter le script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { main, generatePNGs, generateICO }
