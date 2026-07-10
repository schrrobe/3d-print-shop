import { describe, expect, it } from 'vitest'
import {
  hasValidUploadContent,
  MAX_UPLOAD_BYTES,
  sanitizeFilename,
  validateUploadFile,
} from '../src/upload-validation.js'

describe('upload validation', () => {
  it('accepts .stl and .3mf files', () => {
    expect(validateUploadFile({ filename: 'model.stl', sizeBytes: 1024 }).ok).toBe(true)
    expect(validateUploadFile({ filename: 'model.3mf', sizeBytes: 1024 }).ok).toBe(true)
    expect(validateUploadFile({ filename: 'MODEL.STL', sizeBytes: 1024 }).ok).toBe(true)
  })

  it('rejects other extensions', () => {
    for (const name of ['model.obj', 'model.gcode', 'model.exe', 'model.stl.exe', 'model']) {
      const result = validateUploadFile({ filename: name, sizeBytes: 1024 })
      expect(result.ok).toBe(false)
      expect(result.error).toBe('invalid_extension')
    }
  })

  it('enforces the 50 MB limit inclusively', () => {
    expect(validateUploadFile({ filename: 'big.stl', sizeBytes: MAX_UPLOAD_BYTES }).ok).toBe(true)
    const tooBig = validateUploadFile({ filename: 'big.stl', sizeBytes: MAX_UPLOAD_BYTES + 1 })
    expect(tooBig.ok).toBe(false)
    expect(tooBig.error).toBe('file_too_large')
    expect(MAX_UPLOAD_BYTES).toBe(52_428_800)
  })

  it('rejects empty files and filenames', () => {
    expect(validateUploadFile({ filename: '', sizeBytes: 10 }).error).toBe('empty_filename')
    expect(validateUploadFile({ filename: '  ', sizeBytes: 10 }).error).toBe('empty_filename')
    expect(validateUploadFile({ filename: 'a.stl', sizeBytes: 0 }).error).toBe('empty_file')
  })

  it('treats dotfiles as extensionless', () => {
    expect(validateUploadFile({ filename: '.stl', sizeBytes: 10 }).error).toBe('invalid_extension')
  })

  it('sanitizes path traversal and unsafe characters', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd')
    expect(sanitizeFilename('C:\\evil\\model.stl')).toBe('model.stl')
    expect(sanitizeFilename('meine datei (final).stl')).toBe('meine_datei__final_.stl')
  })
})

describe('upload content signatures', () => {
  it('accepts 3MF ZIP and ASCII STL headers', () => {
    expect(
      hasValidUploadContent({
        extension: '.3mf',
        sizeBytes: 100,
        header: Uint8Array.from([0x50, 0x4b, 3, 4]),
      }),
    ).toBe(true)
    expect(
      hasValidUploadContent({
        extension: '.stl',
        sizeBytes: 20,
        header: new TextEncoder().encode('solid model\nendsolid'),
      }),
    ).toBe(true)
  })

  it('checks binary STL length and rejects renamed arbitrary files', () => {
    const header = new Uint8Array(84)
    new DataView(header.buffer).setUint32(80, 2, true)
    expect(hasValidUploadContent({ extension: '.stl', sizeBytes: 184, header })).toBe(true)
    expect(
      hasValidUploadContent({
        extension: '.3mf',
        sizeBytes: 100,
        header: new TextEncoder().encode('evil'),
      }),
    ).toBe(false)
    expect(hasValidUploadContent({ extension: '.stl', sizeBytes: 185, header })).toBe(false)
  })
})
