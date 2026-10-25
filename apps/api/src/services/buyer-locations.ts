import { readFileSync } from 'node:fs'

let postalCoordinates: Map<string, [number, number]> | undefined

/** Postcode centroid in DE/AT/CH (GeoNames table, loaded on first use). */
function coordinatesOf(country: string, zip: string) {
  postalCoordinates ??= new Map(
    readFileSync(new URL('../../assets/geo/postal-codes.tsv', import.meta.url), 'utf8')
      .split('\n')
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const [c, plz, lat, lon] = line.split('\t')
        return [`${c}-${plz}`, [Number(lat), Number(lon)]] as const
      }),
  )
  return postalCoordinates.get(`${country.trim().toUpperCase()}-${zip.trim()}`)
}

/** Orders per postcode centroid of the shipping address; unknown postcodes are dropped. */
export function buyerLocations(orders: { country: string; zip: string }[]) {
  const places = new Map<string, { lat: number; lon: number; count: number }>()
  for (const { country, zip } of orders) {
    const at = coordinatesOf(country, zip)
    if (!at) continue
    // several postcodes can share a centroid
    const place = places.get(at.join()) ?? { lat: at[0], lon: at[1], count: 0 }
    place.count++
    places.set(at.join(), place)
  }
  return [...places.values()]
}
