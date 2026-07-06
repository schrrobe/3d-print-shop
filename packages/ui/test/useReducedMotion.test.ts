import { createApp, defineComponent, h, type Ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useReducedMotion } from '../src/composables/useReducedMotion'

type ChangeListener = (event: { matches: boolean }) => void

function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<ChangeListener>()
  const mql = {
    matches: initialMatches,
    addEventListener: (_: string, listener: ChangeListener) => listeners.add(listener),
    removeEventListener: (_: string, listener: ChangeListener) => listeners.delete(listener),
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql),
  )
  window.matchMedia = globalThis.matchMedia as typeof window.matchMedia
  return {
    listeners,
    setMatches(matches: boolean) {
      mql.matches = matches
      listeners.forEach((listener) => listener({ matches }))
    },
  }
}

function mountComposable(): { reduced: Ref<boolean>; unmount: () => void } {
  let reduced!: Ref<boolean>
  const app = createApp(
    defineComponent({
      setup() {
        reduced = useReducedMotion()
        return () => h('div')
      },
    }),
  )
  app.mount(document.createElement('div'))
  return { reduced, unmount: () => app.unmount() }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useReducedMotion', () => {
  it('reads the media query on mount', () => {
    stubMatchMedia(false)
    const { reduced, unmount } = mountComposable()

    expect(reduced.value).toBe(false)
    unmount()
  })

  it('reacts to media query changes', () => {
    const media = stubMatchMedia(false)
    const { reduced, unmount } = mountComposable()

    media.setMatches(true)

    expect(reduced.value).toBe(true)
    unmount()
  })

  it('removes its listener on unmount', () => {
    const media = stubMatchMedia(true)
    const { unmount } = mountComposable()

    expect(media.listeners.size).toBe(1)
    unmount()
    expect(media.listeners.size).toBe(0)
  })
})
