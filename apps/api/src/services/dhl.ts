import { env } from '../env.js'
import { ApiError, badRequest } from '../middleware/error.js'
import type { Company } from './company.js'

/**
 * DHL Parcel DE Shipping API v2 — label creation and cancellation.
 * https://developer.dhl.com/api-reference/parcel-de-shipping-post-parcel-germany-v2
 */

/** Shop delivery countries (checkout) → ISO alpha-3, which DHL expects. */
const ALPHA3: Record<string, string> = {
  DE: 'DEU',
  AT: 'AUT',
  CH: 'CHE',
  NL: 'NLD',
  BE: 'BEL',
  LU: 'LUX',
  FR: 'FRA',
  DK: 'DNK',
  PL: 'POL',
  CZ: 'CZE',
  IT: 'ITA',
  ES: 'ESP',
}
/** Non-EU delivery countries need a customs declaration (CN23). */
const CUSTOMS_COUNTRIES = new Set(['CH'])
/** Every product is a 3D-printed plastic article. */
const HS_CODE = '39269097'
/** Neutral goods description: item names may carry personalization (names) — data minimisation. */
const CUSTOMS_DESCRIPTION = 'Plastic storage box (3D printed)'
/** Common Label thermal print, roll, 103×150 mm. */
const PRINT_FORMAT = '910-300-410'
const PROFILE = 'STANDARD_GRUPPENPROFIL'

export interface LabelOrder {
  orderNumber: string
  firstName: string
  lastName: string
  company: string | null
  street: string
  zip: string
  city: string
  country: string
  email: string
  carrierEmailConsentAt: Date | null
  shippingCents: number
}

export interface LabelItem {
  quantity: number
  unitPriceCents: number
}

const cut = (s: string, max: number) => s.trim().slice(0, max)
const euros = (cents: number) => cents / 100

/** Builds one DHL shipment (pure — no I/O). */
export function toDhlShipment(
  order: LabelOrder,
  items: LabelItem[],
  weightGrams: number,
  shipper: Pick<Company, 'name' | 'street' | 'zip' | 'city' | 'email'>,
) {
  const country = order.country.toUpperCase()
  const alpha3 = ALPHA3[country]
  if (!alpha3) throw badRequest(`DHL-Label für Lieferland ${country} nicht unterstützt`)
  const domestic = country === 'DE'
  const person = `${order.firstName} ${order.lastName}`

  const customs = CUSTOMS_COUNTRIES.has(country)
    ? (() => {
        const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)
        // Item weights must not exceed the parcel weight: floor the even split.
        const unitWeight = Math.max(1, Math.floor(weightGrams / Math.max(1, totalQty)))
        return {
          exportType: 'COMMERCIAL_GOODS',
          postalCharges: { currency: 'EUR', value: euros(order.shippingCents) },
          items: items.map((i) => ({
            itemDescription: CUSTOMS_DESCRIPTION,
            packagedQuantity: i.quantity,
            countryOfOrigin: 'DEU',
            hsCode: HS_CODE,
            // ponytail: free box (0 €) declared at 0,01 €; DHL rejects zero values.
            itemValue: { currency: 'EUR', value: euros(Math.max(1, i.unitPriceCents)) },
            itemWeight: { uom: 'g', value: unitWeight },
          })),
        }
      })()
    : undefined

  return {
    product: domestic ? 'V01PAK' : 'V53WPAK',
    billingNumber: domestic
      ? env.DHL_BILLING_NUMBER_NATIONAL
      : env.DHL_BILLING_NUMBER_INTERNATIONAL,
    refNo: order.orderNumber,
    shipper: {
      name1: cut(shipper.name, 50),
      addressStreet: cut(shipper.street, 50),
      postalCode: shipper.zip,
      city: cut(shipper.city, 40),
      country: 'DEU',
      email: shipper.email,
    },
    consignee: {
      name1: cut(order.company || person, 50),
      ...(order.company ? { name2: cut(person, 50) } : {}),
      addressStreet: cut(order.street, 50),
      postalCode: order.zip.trim(),
      city: cut(order.city, 40),
      country: alpha3,
      // Delivery notification only with the checkout opt-in (ADR 0001).
      ...(order.carrierEmailConsentAt ? { email: order.email } : {}),
    },
    details: { weight: { uom: 'g', value: weightGrams } },
    ...(customs ? { customs } : {}),
  }
}

interface DhlValidationMessage {
  property?: string
  validationMessage?: string
  validationState?: string
}
interface DhlItem {
  shipmentNo?: string
  sstatus?: { title?: string; status?: number; detail?: string }
  label?: { b64?: string }
  validationMessages?: DhlValidationMessage[]
}
interface DhlResponse {
  status?: { title?: string; status?: number; detail?: string }
  items?: DhlItem[]
  detail?: string
  title?: string
}

const messagesOf = (item: DhlItem | undefined, state: 'Error' | 'Warning') =>
  (item?.validationMessages ?? [])
    .filter((m) => m.validationState === state)
    .map((m) => [m.property, m.validationMessage].filter(Boolean).join(': '))

/** Maps a DHL create response to label data, or a 400 with DHL's own messages. */
export function parseCreateResponse(
  httpStatus: number,
  body: DhlResponse,
): { shipmentNo: string; pdf: Buffer; warnings: string[] } {
  const item = body.items?.[0]
  if (item?.shipmentNo && !/^[A-Za-z0-9]{1,40}$/.test(item.shipmentNo)) {
    // It ends up in a file name — never trust it blindly.
    throw new ApiError(502, 'DHL: ungültige Sendungsnummer in der Antwort', 'dhl_response')
  }
  if (httpStatus < 300 && item?.shipmentNo && item.label?.b64) {
    return {
      shipmentNo: item.shipmentNo,
      pdf: Buffer.from(item.label.b64, 'base64'),
      warnings: messagesOf(item, 'Warning'),
    }
  }
  const errors = messagesOf(item, 'Error')
  const detail = item?.sstatus?.detail ?? body.status?.detail ?? body.detail ?? body.title
  throw badRequest(
    `DHL: ${errors.length ? errors.join(' · ') : (detail ?? `HTTP ${httpStatus}`)}`,
    errors,
  )
}

function assertConfigured() {
  if (!env.DHL_API_KEY || !env.DHL_API_SECRET || !env.DHL_USERNAME || !env.DHL_PASSWORD) {
    throw new ApiError(
      503,
      'DHL ist nicht konfiguriert (DHL_* Umgebungsvariablen)',
      'dhl_unconfigured',
    )
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value
  const res = await fetch(`${env.DHL_API_URL}/parcel/de/account/auth/ropc/v1/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      username: env.DHL_USERNAME,
      password: env.DHL_PASSWORD,
      client_id: env.DHL_API_KEY,
      client_secret: env.DHL_API_SECRET,
    }),
  })
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string
    expires_in?: number
  }
  if (!res.ok || !body.access_token) {
    throw new ApiError(502, `DHL-Anmeldung fehlgeschlagen (HTTP ${res.status})`, 'dhl_auth')
  }
  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + ((body.expires_in ?? 1800) - 60) * 1000,
  }
  return cachedToken.value
}

async function dhlFetch(pathAndQuery: string, init: RequestInit): Promise<[number, DhlResponse]> {
  assertConfigured()
  const res = await fetch(`${env.DHL_API_URL}/parcel/de/shipping/v2${pathAndQuery}`, {
    ...init,
    headers: {
      authorization: `Bearer ${await accessToken()}`,
      accept: 'application/json',
      'accept-language': 'de-DE',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
  })
  if (res.status === 401) cachedToken = null
  return [res.status, (await res.json().catch(() => ({}))) as DhlResponse]
}

/** Creates a label (PDF, 103×150 mm; CN23 for customs countries is combined into the PDF). */
export async function createDhlLabel(shipment: ReturnType<typeof toDhlShipment>) {
  const query = new URLSearchParams({
    printFormat: PRINT_FORMAT,
    docFormat: 'PDF',
    combine: 'true',
  })
  const [status, body] = await dhlFetch(`/orders?${query}`, {
    method: 'POST',
    body: JSON.stringify({ profile: PROFILE, shipments: [shipment] }),
  })
  return parseCreateResponse(status, body)
}

/** Cancels a label (possible until DHL's end-of-day manifest). */
export async function cancelDhlLabel(shipmentNo: string): Promise<void> {
  const query = new URLSearchParams({ profile: PROFILE, shipment: shipmentNo })
  const [status, body] = await dhlFetch(`/orders?${query}`, { method: 'DELETE' })
  const item = body.items?.[0]
  if (status < 300 && (item?.sstatus?.status ?? 200) < 300) return
  const detail = item?.sstatus?.detail ?? body.status?.detail ?? body.detail ?? `HTTP ${status}`
  throw new ApiError(409, `DHL-Storno fehlgeschlagen: ${detail}`, 'conflict')
}
