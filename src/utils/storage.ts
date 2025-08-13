export function getJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function setJSON<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {}
}

// Helpers robustes
function byteLength(text: string): number {
  try {
    return new TextEncoder().encode(text).length
  } catch {
    return unescape(encodeURIComponent(text)).length
  }
}

/**
 * Écrit une chaîne en tronquant si nécessaire pour respecter un plafond.
 * Par défaut, on coupe par le début (on garde la fin la plus récente).
 */
export function setTextWithQuota(
  key: string,
  value: string,
  maxBytes: number,
  trimFrom: 'start' | 'end' = 'start',
): boolean {
  try {
    let text = value || ''
    if (byteLength(text) > maxBytes) {
      // Tronquer progressivement (binaire: on coupe à ~maxBytes chars, puis on affine)
      const approxChars = Math.max(0, Math.floor(maxBytes * 0.75))
      text = trimFrom === 'start' ? text.slice(-approxChars) : text.slice(0, approxChars)
      // Ajustement fin si encore trop long
      while (byteLength(text) > maxBytes && text.length > 0) {
        text = trimFrom === 'start' ? text.slice(1) : text.slice(0, -1)
      }
    }
    localStorage.setItem(key, text)
    return true
  } catch {
    return false
  }
}

/**
 * Spécifique logs volumineux: tronque à maxKB, conserve la fin (logs récents).
 */
export function setLog(key: string, text: string, maxKB: number = 512): boolean {
  const maxBytes = Math.max(16 * 1024, Math.floor(maxKB * 1024))
  return setTextWithQuota(key, text, maxBytes, 'start')
}

export function getText(key: string, fallback = ''): string {
  try {
    const v = localStorage.getItem(key)
    return v == null ? fallback : v
  } catch {
    return fallback
  }
}
