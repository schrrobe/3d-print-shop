import { reactive } from 'vue'

export type ToastVariant = 'default' | 'success' | 'error'

export interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
  durationMs: number
}

/** Module-scoped store so any component (and PsToastProvider) shares the same list. */
const toasts = reactive<ToastItem[]>([])
let nextId = 1

export function useToast() {
  function show(
    message: string,
    opts?: { variant?: ToastVariant; durationMs?: number },
  ): number {
    const id = nextId++
    toasts.push({
      id,
      message,
      variant: opts?.variant ?? 'default',
      durationMs: opts?.durationMs ?? 4000,
    })
    return id
  }

  function dismiss(id: number): void {
    const index = toasts.findIndex((toast) => toast.id === id)
    if (index !== -1) toasts.splice(index, 1)
  }

  return { toasts, show, dismiss }
}
