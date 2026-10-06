export type UploadLogType =
  | 'key_failed'
  | 'key_success'
  | 'upload_attempt'
  | 'upload_success'
  | 'upload_error'
  | 'upload_delete'

export interface UploadLogEntry {
  timestamp: string
  type: UploadLogType
  category?: string
  fileName?: string
  fileSize?: number
  fileMimeType?: string
  publicId?: string
  url?: string
  error?: string
  uploadSource?: string
  userAgent?: string
  ip?: string
}

export async function appendUploadLog(entry: Omit<UploadLogEntry, 'timestamp'>) {
  const logEntry: UploadLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  }

  console.log('[upload-logger]', JSON.stringify(logEntry))
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return 'unknown'
}
