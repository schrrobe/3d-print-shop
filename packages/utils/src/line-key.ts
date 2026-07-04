/**
 * Canonical key for a product + color configuration. Shared by the cart and the
 * wishlist so identical configurations merge, and by the API to dedupe
 * SavedConfiguration rows (stable share links).
 */
export type ColorSelection = Record<string, string>

export function canonicalColorSelection(selection: ColorSelection): string {
  const sorted = Object.keys(selection)
    .sort()
    .reduce<ColorSelection>((acc, key) => {
      acc[key] = selection[key]!
      return acc
    }, {})
  return JSON.stringify(sorted)
}

export function lineKey(productId: string, selection: ColorSelection): string {
  return `${productId}:${canonicalColorSelection(selection)}`
}
