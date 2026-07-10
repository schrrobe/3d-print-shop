/** Customers may only upload .stl and .3mf files, up to 50 MB. */
export const ALLOWED_UPLOAD_EXTENSIONS = ['.stl', '.3mf'] as const
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

export type UploadValidationError =
  'empty_filename' | 'invalid_extension' | 'file_too_large' | 'empty_file'

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

export function validateUploadFile(file: {
  filename: string
  sizeBytes: number
}): UploadValidationResult {
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

/** Lightweight content check before a customer model is persisted for staff review. */
export function hasValidUploadContent(input: {
  extension: string
  sizeBytes: number
  header: Uint8Array
}): boolean {
  const { extension, sizeBytes, header } = input
  if (extension === '.3mf') {
    // 3MF is an OPC/ZIP package and must start with a local-file header.
    return header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04
  }
  if (extension !== '.stl') return false

  const asciiHeader = new TextDecoder('ascii')
    .decode(header.subarray(0, 80))
    .trimStart()
    .toLowerCase()
  if (asciiHeader.startsWith('solid')) return sizeBytes > 6
  if (header.length < 84 || sizeBytes < 84) return false
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength)
  const triangleCount = view.getUint32(80, true)
  return 84 + triangleCount * 50 === sizeBytes
}

/** Strip path segments and unsafe characters from a client-provided filename. */
export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? ''
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 128)
}
