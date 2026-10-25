import { uuidv7 } from '@print-shop/utils'

let current = { path: '', id: '' }

/**
 * One event id per page view, shared by the first-party tracker (→ server CAPI)
 * and the ad pixels so Meta can dedupe the pair. Both plugins call this with
 * the same pathname for a navigation; a new pathname starts a new page view.
 */
export function pageEventId(pathname: string): string {
  if (current.path !== pathname) current = { path: pathname, id: uuidv7() }
  return current.id
}
