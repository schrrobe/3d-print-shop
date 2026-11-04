import { ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDragging } from '../src/composables/useDragging'

const dragEvent = (type: string, clientY: number, clientX = 0, target?: Element) => {
  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent
  Object.defineProperty(event, 'clientY', { value: clientY })
  Object.defineProperty(event, 'clientX', { value: clientX })
  if (target) target.dispatchEvent(event)
  return event
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('useDragging reorder', () => {
  it('moves the dragged item into the hovered slot and commits the preview on drop', async () => {
    const list = ref(['a', 'b', 'c', 'd'])
    const onOrderChange = vi.fn((next: string[]) => {
      list.value = next
    })
    const { items, draggedItem, isDragging, handleDragStart, handleDragOver, handleDrop } =
      useDragging(list, onOrderChange)

    handleDragStart(dragEvent('dragstart', 0), 0)
    expect(isDragging.value).toBe(true)
    expect(draggedItem.value).toBe('a')

    handleDragOver(dragEvent('dragover', 100), 2)
    // move, not swap: b and c shift up
    expect(items.value).toEqual(['b', 'c', 'a', 'd'])

    await handleDrop(dragEvent('drop', 100))
    expect(onOrderChange).toHaveBeenCalledWith(['b', 'c', 'a', 'd'])
    expect(items.value).toEqual(['b', 'c', 'a', 'd'])
    expect(isDragging.value).toBe(false)
  })

  it('does not commit when the order is unchanged or the drag is cancelled', async () => {
    const list = ref(['a', 'b', 'c'])
    const onOrderChange = vi.fn()
    const { items, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragging(
      list,
      onOrderChange,
    )

    handleDragStart(dragEvent('dragstart', 0), 1)
    await handleDrop(dragEvent('drop', 0))
    expect(onOrderChange).not.toHaveBeenCalled()

    handleDragStart(dragEvent('dragstart', 0), 0)
    handleDragOver(dragEvent('dragover', 100), 2)
    handleDragEnd() // e.g. Escape / dropped outside
    expect(items.value).toEqual(['a', 'b', 'c'])
    expect(onOrderChange).not.toHaveBeenCalled()
  })

  it('ignores dragover without pointer movement so a reflowing grid cannot oscillate', () => {
    const { items, handleDragStart, handleDragOver } = useDragging(ref(['a', 'b', 'c']))

    handleDragStart(dragEvent('dragstart', 50, 50), 0)
    handleDragOver(dragEvent('dragover', 52, 51), 2)
    expect(items.value).toEqual(['a', 'b', 'c'])

    handleDragOver(dragEvent('dragover', 60, 50), 2)
    expect(items.value).toEqual(['b', 'c', 'a'])

    // layout jumped, cursor still: a different item is now under it
    handleDragOver(dragEvent('dragover', 60, 50), 0)
    expect(items.value).toEqual(['b', 'c', 'a'])
  })
})

describe('useDragging auto scroll', () => {
  it('scrolls the scroll parent while dragging near its edges and stops on drag end', () => {
    vi.useFakeTimers()
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
      (cb) => setTimeout(() => cb(0), 16) as unknown as number,
    )
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => clearTimeout(id))

    const scroller = document.createElement('div')
    scroller.style.overflowY = 'auto'
    Object.defineProperty(scroller, 'scrollHeight', { value: 1000 })
    Object.defineProperty(scroller, 'clientHeight', { value: 400 })
    scroller.getBoundingClientRect = () => ({ top: 100, bottom: 500 }) as DOMRect
    const handle = document.createElement('div')
    scroller.appendChild(handle)
    document.body.appendChild(scroller)

    const { handleDragStart, handleDragEnd } = useDragging(ref(['a', 'b']))
    handleDragStart(dragEvent('dragstart', 480, 0, handle), 0)

    document.dispatchEvent(dragEvent('dragover', 490))
    vi.advanceTimersByTime(48)
    expect(scroller.scrollTop).toBeGreaterThan(0)

    const scrolled = scroller.scrollTop
    document.dispatchEvent(dragEvent('dragover', 300))
    vi.advanceTimersByTime(48)
    expect(scroller.scrollTop).toBe(scrolled)

    document.dispatchEvent(dragEvent('dragover', 110))
    vi.advanceTimersByTime(48)
    expect(scroller.scrollTop).toBeLessThan(scrolled)

    handleDragEnd()
    const stopped = scroller.scrollTop
    document.dispatchEvent(dragEvent('dragover', 490))
    vi.advanceTimersByTime(48)
    expect(scroller.scrollTop).toBe(stopped)
  })
})
