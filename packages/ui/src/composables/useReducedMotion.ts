import { onMounted, onUnmounted, ref, type Ref } from 'vue'

/** Reactive prefers-reduced-motion — SSR-safe (defaults to reduced on server). */
export function useReducedMotion(): Ref<boolean> {
  const reduced = ref(true)
  let mql: MediaQueryList | null = null
  const update = () => {
    reduced.value = mql?.matches ?? true
  }
  onMounted(() => {
    mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    update()
    mql.addEventListener('change', update)
  })
  onUnmounted(() => mql?.removeEventListener('change', update))
  return reduced
}
