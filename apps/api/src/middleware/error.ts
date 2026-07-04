import { InvalidStatusTransitionError } from '@print-shop/utils'
import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { isProduction } from '../env.js'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const notFound = (message = 'Not found') => new ApiError(404, message, 'not_found')
export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, message, 'bad_request', details)
export const unauthorized = (message = 'Unauthorized') => new ApiError(401, message, 'unauthorized')
export const forbidden = (message = 'Forbidden') => new ApiError(403, message, 'forbidden')
export const conflict = (message: string, details?: unknown) =>
  new ApiError(409, message, 'conflict', details)

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res
      .status(err.status)
      .json({ error: err.code ?? 'error', message: err.message, details: err.details })
    return
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'validation_error',
      message: 'Invalid request data',
      details: err.flatten(),
    })
    return
  }
  if (err instanceof InvalidStatusTransitionError) {
    res.status(409).json({ error: 'invalid_transition', message: err.message })
    return
  }
  // Multer file size / type errors
  if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'file_too_large', message: 'File exceeds the 50 MB limit' })
    return
  }
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE')
  ) {
    res.status(400).json({ error: 'too_many_files', message: 'Too many files uploaded' })
    return
  }

  console.error(`[api] Unhandled error on ${req.method} ${req.path}:`, err)
  res.status(500).json({
    error: 'internal_error',
    message: isProduction ? 'Internal server error' : String(err),
  })
}
