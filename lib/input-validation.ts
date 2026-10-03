const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

export function sanitizeText(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.normalize('NFKC').replace(/\r\n?/g, '\n').replace(CONTROL_CHARACTERS, '').trim()
}

export function isValidEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function sanitizePhone(value: unknown) {
  const phone = sanitizeText(value)
  if (!phone) return ''
  const digitCount = phone.match(/\d/g)?.length ?? 0
  return /^[+()\d.\-\s]+$/.test(phone) && digitCount >= 7 && digitCount <= 15 ? phone : null
}

export function sanitizeHttpUrl(value: unknown) {
  const url = sanitizeText(value)
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return !parsed.username && !parsed.password && (parsed.protocol === 'https:' || parsed.protocol === 'http:')
      ? parsed.toString()
      : null
  } catch {
    return null
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function readJsonBody(request: Request, maxBytes = 64 * 1024): Promise<unknown | null> {
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return null

  const reader = request.body?.getReader()
  if (!reader) return null
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > maxBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown
  } catch {
    return null
  }
}
