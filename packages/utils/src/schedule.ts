/** Production calendar helpers (all timestamps UTC). */

export interface TimeWindow {
  startsAt: Date | string
  endsAt: Date | string
}

function toMs(value: Date | string): number {
  return typeof value === 'string' ? new Date(value).getTime() : value.getTime()
}

/**
 * True when two half-open intervals [start, end) overlap.
 * Touching edges (a.end === b.start) do NOT count as overlap.
 */
export function windowsOverlap(a: TimeWindow, b: TimeWindow): boolean {
  return toMs(a.startsAt) < toMs(b.endsAt) && toMs(b.startsAt) < toMs(a.endsAt)
}

/** All windows from `existing` that overlap `candidate`. */
export function findOverlaps<T extends TimeWindow>(candidate: TimeWindow, existing: T[]): T[] {
  return existing.filter((w) => windowsOverlap(candidate, w))
}
