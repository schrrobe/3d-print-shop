import type { gsap as GsapCore } from 'gsap'
import type { ScrollTrigger as ScrollTriggerCore } from 'gsap/ScrollTrigger'
import { onBeforeUnmount, onMounted } from 'vue'

type GsapContextFn = (gsap: typeof GsapCore, ScrollTrigger: typeof ScrollTriggerCore) => void

/**
 * Runs GSAP/ScrollTrigger animations client-side only, skipping entirely
 * when the user prefers reduced motion. Cleans up its context on unmount.
 */
export function useMotion(setup: GsapContextFn) {
  let ctx: { revert: () => void } | null = null

  onMounted(async () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ])
    gsap.registerPlugin(ScrollTrigger)
    ctx = gsap.context(() => setup(gsap, ScrollTrigger))
  })

  onBeforeUnmount(() => ctx?.revert())
}
