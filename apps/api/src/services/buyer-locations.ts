import { readFileSync } from 'node:fs'

let postalCoordinates: Map<string, [number, number]> | undefined

/** Postcode centroid for the checkout countries (GeoNames table, loaded on first use). */
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
  // table keys are digits only: '1011 AB' (NL) -> 1011, 'L-4968' (LU) -> 4968, '59-700' (PL) -> 59700
  return postalCoordinates.get(`${countryCode(country)}-${zip.replace(/\D/g, '')}`)
}

const countryCode = (country: string) => country.trim().toUpperCase()

/** ISO codes of every country with at least one order, whether or not its postcode is known. */
export function buyerCountries(orders: { country: string }[]) {
  return [...new Set(orders.map((o) => countryCode(o.country)))]
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
