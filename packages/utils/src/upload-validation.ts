/** Customers may only upload .stl and .3mf files, up to 50 MB. */
export const ALLOWED_UPLOAD_EXTENSIONS = ['.stl', '.3mf'] as const
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

export type UploadValidationError = 'empty_filename' | 'invalid_extension' | 'file_too_large' | 'empty_file'

export interface UploadValidationResult {
  ok: boolean
  error?: UploadValidationError
  extension?: string
}

export function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf('.')
  if (idx <= 0) return ''
  return filename.slice(idx).toLowerCase()
}

export function validateUploadFile(file: { filename: string; sizeBytes: number }): UploadValidationResult {
  const filename = file.filename?.trim()
  if (!filename) return { ok: false, error: 'empty_filename' }

  const extension = getFileExtension(filename)
  if (!(ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(extension)) {
    return { ok: false, error: 'invalid_extension', extension }
  }
  if (file.sizeBytes <= 0) return { ok: false, error: 'empty_file', extension }
  if (file.sizeBytes > MAX_UPLOAD_BYTES) return { ok: false, error: 'file_too_large', extension }
  return { ok: true, extension }
}

/** Strip path segments and unsafe characters from a client-provided filename. */
export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? ''
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 128)
}
