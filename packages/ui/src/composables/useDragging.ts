import {
  computed,
  getCurrentScope,
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
  type MaybeRefOrGetter,
} from 'vue'

/** Auto-scroll zone at the scroller's top/bottom edge, in px. */
const EDGE = 64
const MAX_SPEED = 18
/**
 * Pointer travel needed before the preview may change again. Without it, a grid with
 * mixed-size items reflows under a still cursor and the preview flips back and forth.
 */
const MOVE_THRESHOLD = 4

const findScrollParent = (element: Element | null): Element => {
  for (let node = element; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight) return node
  }
  return document.scrollingElement ?? document.documentElement
}

const edgeBounds = (scroller: Element) => {
  if (scroller === document.scrollingElement || scroller === document.documentElement) {
    return { top: 0, bottom: window.innerHeight }
  }
  const { top, bottom } = scroller.getBoundingClientRect()
  return { top, bottom }
}

/**
 * Native HTML5 drag & drop reordering with live preview and edge auto-scroll.
 * Render `items`; bind `handleDragStart/Over/End` on each item and `handleDrop` (+ `@dragover.prevent`)
 * on the container, so a drop in the gap between items still commits.
 */
export function useDragging<T>(
  source: MaybeRefOrGetter<T[]>,
  onOrderChange?: (newList: T[]) => void | Promise<void>,
) {
  const list = computed(() => toValue(source))
  const draggedIndex = ref<number | null>(null)
  const preview = shallowRef<T[] | null>(null)
  let lastX = 0
  let lastY = 0

  const items = computed(() => preview.value ?? list.value)
  const isDragging = computed(() => draggedIndex.value !== null)
  const draggedItem = computed(() =>
    draggedIndex.value === null ? null : list.value[draggedIndex.value],
  )

  let scroller: Element | null = null
  let scrollSpeed = 0
  let scrollFrame = 0

  const stepScroll = () => {
    if (!scroller || !scrollSpeed) {
      scrollFrame = 0
      return
    }
    scroller.scrollTop += scrollSpeed
    scrollFrame = requestAnimationFrame(stepScroll)
  }

  const onDocumentDragOver = (event: DragEvent) => {
    if (!scroller) return
    const { top, bottom } = edgeBounds(scroller)
    const fromTop = event.clientY - top
    const fromBottom = bottom - event.clientY
    if (fromTop < EDGE) scrollSpeed = -Math.ceil(Math.min(1, (EDGE - fromTop) / EDGE) * MAX_SPEED)
    else if (fromBottom < EDGE)
      scrollSpeed = Math.ceil(Math.min(1, (EDGE - fromBottom) / EDGE) * MAX_SPEED)
    else scrollSpeed = 0
    if (scrollSpeed && !scrollFrame) scrollFrame = requestAnimationFrame(stepScroll)
  }

  const startAutoScroll = (from: Element | null) => {
    scroller = findScrollParent(from)
    document.addEventListener('dragover', onDocumentDragOver)
  }

  const stopAutoScroll = () => {
    document.removeEventListener('dragover', onDocumentDragOver)
    if (scrollFrame) cancelAnimationFrame(scrollFrame)
    scrollFrame = 0
    scrollSpeed = 0
    scroller = null
  }

  const handleDragEnd = () => {
    stopAutoScroll()
    draggedIndex.value = null
    preview.value = null
  }

  const handleDragStart = (event: DragEvent, index: number) => {
    draggedIndex.value = index
    lastX = event.clientX
    lastY = event.clientY
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      // Firefox won't start a drag without data
      event.dataTransfer.setData('text/plain', '')
    }
    startAutoScroll((event.currentTarget ?? event.target) as Element | null)
  }

  /** `index` is the hovered item's position in `items` (the preview). */
  const handleDragOver = (event: DragEvent, index: number) => {
    const from = draggedIndex.value
    if (from === null) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'

    if (items.value[index] === list.value[from]) return
    if (Math.hypot(event.clientX - lastX, event.clientY - lastY) < MOVE_THRESHOLD) return
    lastX = event.clientX
    lastY = event.clientY
    preview.value = list.value.toSpliced(from, 1).toSpliced(index, 0, list.value[from] as T)
  }

  const handleDrop = async (event: DragEvent) => {
    if (draggedIndex.value === null) return
    event.preventDefault()
    const committed = preview.value
    try {
      if (committed && committed.some((item, i) => item !== list.value[i]))
        await onOrderChange?.(committed)
    } finally {
      handleDragEnd()
    }
  }

  if (getCurrentScope()) onScopeDispose(stopAutoScroll)

  return {
    items,
    draggedItem,
    isDragging,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  }
}
