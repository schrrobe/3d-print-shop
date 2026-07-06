import { describe, expect, it } from 'vitest'
import { useToast } from '../src/composables/useToast'

describe('useToast', () => {
  it('adds a toast with defaults and returns its id', () => {
    const { toasts, show, dismiss } = useToast()
    const before = toasts.length

    const id = show('Gespeichert')
    const toast = toasts.find((t) => t.id === id)

    expect(toast).toMatchObject({ message: 'Gespeichert', variant: 'default', durationMs: 4000 })
    expect(toasts.length).toBe(before + 1)
    dismiss(id)
  })

  it('applies variant and duration overrides', () => {
    const { toasts, show, dismiss } = useToast()

    const id = show('Fehler', { variant: 'error', durationMs: 1000 })
    const toast = toasts.find((t) => t.id === id)

    expect(toast).toMatchObject({ variant: 'error', durationMs: 1000 })
    dismiss(id)
  })

  it('shares one toast list across composable instances', () => {
    const first = useToast()
    const second = useToast()

    const id = first.show('Geteilt')
    expect(second.toasts.some((t) => t.id === id)).toBe(true)
    second.dismiss(id)
    expect(first.toasts.some((t) => t.id === id)).toBe(false)
  })

  it('ignores dismiss for unknown ids', () => {
    const { toasts, dismiss } = useToast()
    const before = toasts.length

    dismiss(999999)

    expect(toasts.length).toBe(before)
  })
})
