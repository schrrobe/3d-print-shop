import { createHash } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { PERMISSIONS, ROLE_PERMISSIONS } from '@print-shop/utils'
import { USER_ROLES } from '@print-shop/types'
import type { CaliberGroup } from '@print-shop/types'
import argon2 from 'argon2'

for (const path of ['.env', '../../.env']) {
  try {
    process.loadEnvFile(path)
  } catch {
    // CI commonly provides DATABASE_URL directly.
  }
}

const prisma = new PrismaClient()

const DEV_ADMIN_EMAIL = 'admin@example.com'
const DEV_ADMIN_PASSWORD = 'admin-dev-password' // dev/e2e only — change in production!

async function seedRoles() {
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, create: { key }, update: {} })
  }
  for (const roleName of USER_ROLES) {
    const permissionKeys = ROLE_PERMISSIONS[roleName]
    await prisma.role.upsert({
      where: { name: roleName },
      create: {
        name: roleName,
        permissions: { connect: permissionKeys.map((key) => ({ key })) },
      },
      update: {
        permissions: { set: permissionKeys.map((key) => ({ key })) },
      },
    })
  }
}

async function seedUsers() {
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } })
  const productionRole = await prisma.role.findUniqueOrThrow({ where: { name: 'production' } })
  const passwordHash = await argon2.hash(DEV_ADMIN_PASSWORD)

  await prisma.user.upsert({
    where: { email: DEV_ADMIN_EMAIL },
    create: { email: DEV_ADMIN_EMAIL, name: 'Admin', passwordHash, roleId: adminRole.id },
    update: { passwordHash, roleId: adminRole.id, active: true },
  })
  await prisma.user.upsert({
    where: { email: 'produktion@example.com' },
    create: {
      email: 'produktion@example.com',
      name: 'Petra Produktion',
      passwordHash,
      roleId: productionRole.id,
    },
    update: {},
  })

  const supportRole = await prisma.role.findUniqueOrThrow({ where: { name: 'support' } })
  await prisma.user.upsert({
    where: { email: 'support@example.com' },
    create: {
      email: 'support@example.com',
      name: 'Sami Support',
      passwordHash,
      roleId: supportRole.id,
    },
    update: { roleId: supportRole.id, active: true },
  })
}

async function seedColors() {
  const colors = [
    {
      name: 'Brand Green',
      hex: '#31a871',
      material: 'PLA',
      manufacturer: 'Bambu Lab',
      amsSlot: 1,
      stockGrams: 800,
    },
    {
      name: 'Deep Black',
      hex: '#171717',
      material: 'PLA',
      manufacturer: 'Bambu Lab',
      amsSlot: 2,
      stockGrams: 950,
    },
    {
      name: 'Warm White',
      hex: '#f6f3ec',
      material: 'PLA',
      manufacturer: 'Bambu Lab',
      amsSlot: 3,
      stockGrams: 620,
    },
    {
      name: 'Signal Red',
      hex: '#d23f31',
      material: 'PLA',
      manufacturer: 'Polymaker',
      amsSlot: 4,
      stockGrams: 400,
    },
    {
      name: 'Ocean Blue',
      hex: '#1f6fb2',
      material: 'PETG',
      manufacturer: 'Prusament',
      stockGrams: 700,
    },
    {
      name: 'Sun Yellow',
      hex: '#e8b71a',
      material: 'PLA',
      manufacturer: 'Polymaker',
      stockGrams: 300,
    },
    {
      name: 'Slate Grey',
      hex: '#5e5e5e',
      material: 'PETG',
      manufacturer: 'Prusament',
      stockGrams: 550,
    },
    {
      name: 'Neon Orange (ausverkauft)',
      hex: '#ff6a00',
      material: 'PLA',
      manufacturer: 'Polymaker',
      active: false,
      stockGrams: 0,
    },
  ]
  for (const color of colors) {
    await prisma.color.upsert({ where: { name: color.name }, create: color, update: color })
  }
}

const SEED_CALIBERS = [
  { slug: '9mm-luger', name: '9 mm Luger', group: 'HANDGUN', sortOrder: 10 },
  { slug: '45-acp', name: '.45 ACP', group: 'HANDGUN', sortOrder: 20 },
  { slug: '22-lr', name: '.22 lfB', group: 'RIMFIRE', sortOrder: 10 },
  { slug: '223-rem', name: '.223 Rem', group: 'RIFLE', sortOrder: 10 },
  { slug: '308-win', name: '.308 Win', group: 'RIFLE', sortOrder: 20 },
  { slug: '762x39', name: '7,62×39', group: 'RIFLE', sortOrder: 30 },
] as const

// Platzhalterpreise (Cent) pro Kaliber-Gruppe und Boxgröße — vor Livegang festlegen.
const PLACEHOLDER_PRICES: Record<CaliberGroup, Record<50 | 100, number>> = {
  HANDGUN: { 50: 1490, 100: 1990 },
  RIMFIRE: { 50: 1290, 100: 1690 },
  RIFLE: { 50: 1990, 100: 2790 },
}

/** Demo-Produkte vor dem Kaliberbox-Umbau; werden in bestehenden Dev-DBs deaktiviert. */
const LEGACY_DEMO_SLUGS = ['spiral-vase', 'desk-organizer', 'planetary-gear-toy', 'wall-hook-set']

const boxSlug = (caliberSlug: string, capacity: 50 | 100) =>
  `patronenbox-${caliberSlug}-${capacity}`

async function seedCalibers() {
  for (const caliber of SEED_CALIBERS) {
    await prisma.caliber.upsert({ where: { slug: caliber.slug }, create: caliber, update: caliber })
  }
}

async function seedProducts() {
  const colorIds = new Map((await prisma.color.findMany()).map((c) => [c.name, c.id]))
  await prisma.product.updateMany({
    where: { slug: { in: LEGACY_DEMO_SLUGS } },
    data: { active: false },
  })

  for (const caliber of SEED_CALIBERS) {
    for (const capacity of [50, 100] as const) {
      const slug = boxSlug(caliber.slug, capacity)
      const priceCents = PLACEHOLDER_PRICES[caliber.group][capacity]
      const de = {
        name: `Patronenbox ${caliber.name} – ${capacity} Schuss`,
        description: `Patronenbox mit passgenauen Fächern für ${capacity} Patronen ${caliber.name}. Wird auf Bestellung im 3D-Druck gefertigt; Box- und Beschriftungsfarbe wählst du selbst. Hinweis: Die Box dient der Organisation im Waffenschrank.`,
      }
      const en = {
        name: `Cartridge box ${caliber.name} – ${capacity} rounds`,
        description: `Cartridge box with snug-fit compartments for ${capacity} rounds of ${caliber.name}. Printed to order; you choose the box and label colours. Note: the box is meant for organising ammunition inside your gun safe.`,
      }
      const productFields = {
        priceCents,
        active: true,
        capacity,
        familyKey: caliber.slug,
        calibers: { set: [{ slug: caliber.slug }] },
      }
      const existing = await prisma.product.findUnique({ where: { slug } })
      if (existing) {
        await prisma.product.update({ where: { id: existing.id }, data: productFields })
        continue
      }
      await prisma.product.create({
        data: {
          slug,
          ...productFields,
          calibers: { connect: [{ slug: caliber.slug }] },
          translations: {
            create: [
              {
                locale: 'de',
                name: de.name,
                description: de.description,
                seoTitle: `${de.name} — 3D-Druck`,
                seoDescription: de.description.slice(0, 160),
              },
              {
                locale: 'en',
                name: en.name,
                description: en.description,
                seoTitle: `${en.name} — 3D print`,
                seoDescription: en.description.slice(0, 160),
              },
            ],
          },
          colorSlots: {
            create: [
              {
                slot: 'zone_1_main',
                label: 'Box',
                defaultColorId: colorIds.get('Deep Black') ?? null,
              },
              {
                slot: 'zone_4_text',
                label: 'Beschriftung',
                defaultColorId: colorIds.get('Warm White') ?? null,
              },
            ],
          },
          assets: {
            create: [
              {
                type: 'image',
                url: `/images/products/kaliberbox-${capacity}.svg`,
                alt: de.name,
                sortOrder: 0,
              },
            ],
          },
        },
      })
    }
  }
}

/** Default colour selection (Box + Beschriftung) for seeded order lines. */
function defaultSelection(product: {
  colorSlots: { slot: string; defaultColorId: string | null }[]
}): Record<string, string> {
  return Object.fromEntries(
    product.colorSlots.flatMap((s) => (s.defaultColorId ? [[s.slot, s.defaultColorId]] : [])),
  )
}

async function seedProduct(slug: string) {
  return prisma.product.findUniqueOrThrow({
    where: { slug },
    include: { colorSlots: true, translations: true },
  })
}

function productName(
  product: { slug: string; translations: { locale: string; name: string }[] },
  locale: 'de' | 'en' = 'de',
): string {
  return product.translations.find((t) => t.locale === locale)?.name ?? product.slug
}

async function seedPrinters() {
  const printers = [
    {
      name: 'Bambu Lab X1C #1',
      model: 'Bambu Lab X1 Carbon + AMS 2 Pro',
      status: 'idle' as const,
      notes: 'Hauptdrucker, AMS 2 Pro mit 4 Slots',
    },
    {
      name: 'Bambu Lab A1 #2',
      model: 'Bambu Lab A1',
      status: 'maintenance' as const,
      notes: 'Düse 0.4 verstopft — Wartung geplant',
    },
  ]
  for (const p of printers) {
    await prisma.printer.upsert({ where: { name: p.name }, create: p, update: {} })
  }

  // Assert the seeded main printer exists before wiring spools to it below
  await prisma.printer.findUniqueOrThrow({ where: { name: 'Bambu Lab X1C #1' } })
  const colors = await prisma.color.findMany({ where: { amsSlot: { not: null } } })
  const existingSpools = await prisma.filamentSpool.count()
  if (existingSpools === 0) {
    for (const color of colors) {
      await prisma.filamentSpool.create({
        data: {
          colorId: color.id,
          material: color.material,
          remainingGrams: color.stockGrams,
        },
      })
    }
  }
}

async function seedOrders() {
  if ((await prisma.order.count()) > 0) return
  const nine50 = await seedProduct(boxSlug('9mm-luger', 50))
  const win100 = await seedProduct(boxSlug('308-win', 100))
  const rem100 = await seedProduct(boxSlug('223-rem', 100))

  // 1: paid order in production
  await prisma.order.create({
    data: {
      orderNumber: 'PS-2026-00000001',
      accessToken: 'seed-token-order-1',
      status: 'in_production',
      locale: 'de',
      email: 'kunde1@example.com',
      firstName: 'Kim',
      lastName: 'Kunde',
      street: 'Beispielweg 12',
      zip: '10115',
      city: 'Berlin',
      country: 'DE',
      subtotalCents: 2980,
      shippingCents: 699,
      totalCents: 3679,
      items: {
        create: [
          {
            productId: nine50.id,
            name: productName(nine50),
            quantity: 2,
            unitPriceCents: 1490,
            colorSelection: defaultSelection(nine50),
          },
        ],
      },
      payments: {
        create: [{ method: 'stripe', status: 'paid', amountCents: 3679, paidAt: new Date() }],
      },
    },
  })

  // 2: awaiting bank transfer
  await prisma.order.create({
    data: {
      orderNumber: 'PS-2026-00000002',
      accessToken: 'seed-token-order-2',
      status: 'awaiting_bank_transfer',
      locale: 'en',
      email: 'kunde2@example.com',
      firstName: 'Ola',
      lastName: 'Nowak',
      street: 'Przykładowa 5',
      zip: '00-001',
      city: 'Warszawa',
      country: 'PL',
      subtotalCents: 2790,
      shippingCents: 699,
      totalCents: 3489,
      items: {
        create: [
          {
            productId: win100.id,
            name: productName(win100, 'en'),
            quantity: 1,
            unitPriceCents: 2790,
            colorSelection: defaultSelection(win100),
          },
        ],
      },
      payments: {
        create: [
          {
            method: 'bank_transfer',
            status: 'pending',
            amountCents: 3489,
            reference: 'PS-2026-00000002',
          },
        ],
      },
    },
  })

  // 3: free-shipping order (≥ 150 €), shipped
  await prisma.order.create({
    data: {
      orderNumber: 'PS-2026-00000003',
      accessToken: 'seed-token-order-3',
      status: 'shipped',
      locale: 'de',
      email: 'kunde3@example.com',
      firstName: 'Finn',
      lastName: 'Fischer',
      street: 'Hafenstraße 3',
      zip: '20095',
      city: 'Hamburg',
      country: 'DE',
      subtotalCents: 16740,
      shippingCents: 0,
      totalCents: 16740,
      carrier: 'dhl',
      trackingNumber: 'DHL-SEED-123456',
      shippedAt: new Date(),
      items: {
        create: [
          {
            productId: rem100.id,
            name: productName(rem100),
            quantity: 6,
            unitPriceCents: 2790,
            colorSelection: defaultSelection(rem100),
          },
        ],
      },
      payments: {
        create: [{ method: 'bitcoin', status: 'paid', amountCents: 16740, paidAt: new Date() }],
      },
    },
  })
}

// 4: shipped order for kunde1 (portal, reviews, complaints — 4 items, one stays unreviewed for e2e)
async function seedPortalOrder() {
  if (await prisma.order.findUnique({ where: { orderNumber: 'PS-2026-00000004' } })) return
  const lines = [
    await seedProduct(boxSlug('9mm-luger', 50)),
    await seedProduct(boxSlug('45-acp', 100)),
    await seedProduct(boxSlug('22-lr', 50)),
    await seedProduct(boxSlug('762x39', 50)),
  ]
  const subtotalCents = lines.reduce((sum, p) => sum + p.priceCents, 0)
  await prisma.order.create({
    data: {
      orderNumber: 'PS-2026-00000004',
      accessToken: 'seed-token-order-4',
      status: 'shipped',
      locale: 'de',
      email: 'kunde1@example.com',
      firstName: 'Kim',
      lastName: 'Kunde',
      street: 'Beispielweg 12',
      zip: '10115',
      city: 'Berlin',
      country: 'DE',
      subtotalCents,
      shippingCents: 699,
      totalCents: subtotalCents + 699,
      carrier: 'hermes',
      trackingNumber: 'HERMES-SEED-654321',
      shippedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      items: {
        create: lines.map((p) => ({
          productId: p.id,
          name: productName(p),
          quantity: 1,
          unitPriceCents: p.priceCents,
          colorSelection: defaultSelection(p),
        })),
      },
      payments: {
        create: [
          {
            method: 'stripe',
            status: 'paid',
            amountCents: subtotalCents + 699,
            paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
  })
}

async function seedProductionJobs() {
  if ((await prisma.printerJob.count()) > 0) return
  const order1 = await prisma.order.findUniqueOrThrow({
    where: { orderNumber: 'PS-2026-00000001' },
    include: { items: true },
  })
  const x1c = await prisma.printer.findUniqueOrThrow({ where: { name: 'Bambu Lab X1C #1' } })
  await prisma.printerJob.create({
    data: {
      orderId: order1.id,
      orderItemId: order1.items[0]?.id,
      printerId: x1c.id,
      status: 'printing',
      printDurationMinutes: 180,
      startedAt: new Date(),
      spoolNotes: 'AMS Slot 2: Deep Black (Box), Slot 3: Warm White (Beschriftung)',
    },
  })
  await prisma.printer.update({ where: { id: x1c.id }, data: { status: 'printing' } })
}

async function seedQuoteRequest() {
  if ((await prisma.quoteRequest.count()) > 0) return
  await prisma.quoteRequest.create({
    data: {
      name: 'Sam Sample',
      email: 'sam@example.com',
      description:
        'Ersatzteil für eine Küchenmaschine, Material sollte lebensmittelecht sein (PETG).',
      quantity: 2,
      locale: 'de',
      status: 'new',
      files: {
        create: [
          {
            originalName: 'ersatzteil.stl',
            storedPath: '(seed — no file on disk)',
            extension: '.stl',
            sizeBytes: 1_240_000,
          },
        ],
      },
    },
  })
}

async function seedTickets() {
  if ((await prisma.ticket.count()) > 0) return
  const support = await prisma.user.findUniqueOrThrow({ where: { email: 'support@example.com' } })
  const order = await prisma.order.findUnique({ where: { orderNumber: 'PS-2026-00000001' } })

  await prisma.ticketCounter.upsert({
    where: { year: 2026 },
    create: { year: 2026, lastSequence: 3 },
    update: { lastSequence: { increment: 3 } },
  })

  await prisma.ticket.create({
    data: {
      ticketNumber: 'TIC-2026-00001',
      accessToken: 'seed-ticket-token-1',
      status: 'open',
      priority: 'normal',
      category: 'product',
      subject: 'Frage zur Materialauswahl',
      name: 'Klara Kundin',
      email: 'klara@example.com',
      locale: 'de',
      messages: {
        create: [
          {
            authorType: 'customer',
            body: 'Hallo, gibt es die Patronenbox .308 Win auch in PETG statt PLA? Mein Waffenschrank steht im Keller.',
          },
        ],
      },
    },
  })

  await prisma.ticket.create({
    data: {
      ticketNumber: 'TIC-2026-00002',
      accessToken: 'seed-ticket-token-2',
      status: 'in_progress',
      priority: 'high',
      category: 'order',
      subject: 'Lieferzeit meiner Bestellung',
      name: 'Max Mustermann',
      email: 'max@example.com',
      locale: 'de',
      orderId: order?.id,
      assignedToId: support.id,
      messages: {
        create: [
          {
            authorType: 'customer',
            body: 'Wann wird meine Bestellung PS-2026-00000001 voraussichtlich versendet?',
          },
          {
            authorType: 'staff',
            userId: support.id,
            body: 'Hallo Max, die Bestellung ist aktuell im Druck. Voraussichtlicher Versand: Ende der Woche.',
          },
          {
            authorType: 'customer',
            body: 'Super, danke für die schnelle Antwort!',
          },
        ],
      },
    },
  })

  await prisma.ticket.create({
    data: {
      ticketNumber: 'TIC-2026-00003',
      accessToken: 'seed-ticket-token-3',
      status: 'resolved',
      priority: 'low',
      category: 'other',
      subject: 'Rechnung als PDF',
      name: 'Erika Beispiel',
      email: 'erika@example.com',
      locale: 'de',
      resolvedAt: new Date(),
      messages: {
        create: [
          { authorType: 'customer', body: 'Kann ich meine Rechnung nochmal als PDF bekommen?' },
          {
            authorType: 'staff',
            userId: support.id,
            body: 'Klar — die Rechnung hängt jetzt an der Bestellbestätigungs-Mail. Viele Grüße!',
          },
        ],
      },
    },
  })
}

async function seedSocialPosts() {
  if ((await prisma.socialMediaPost.count()) > 0) return
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: DEV_ADMIN_EMAIL } })
  const nine50 = await seedProduct(boxSlug('9mm-luger', 50))
  const win100 = await seedProduct(boxSlug('308-win', 100))

  // Entwurf (Instagram)
  await prisma.socialMediaPost.create({
    data: {
      platform: 'instagram',
      status: 'draft',
      caption: `${productName(nine50)} — frisch vom Drucker.\n\nPassgenaue Fächer, Box- und Beschriftungsfarbe nach Wahl.\n\nJetzt im Shop: http://localhost:3000/products/${nine50.slug}`,
      mediaUrls: ['/images/products/kaliberbox-50.svg'],
      productId: nine50.id,
      createdById: admin.id,
    },
  })

  // Geplanter Post (Facebook, morgen 10:00 UTC)
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(10, 0, 0, 0)
  await prisma.socialMediaPost.create({
    data: {
      platform: 'facebook',
      status: 'scheduled',
      caption: `Ordnung im Waffenschrank: ${productName(win100)} in deinen Wunschfarben.\n\nhttp://localhost:3000/products/${win100.slug}`,
      mediaUrls: ['/images/products/kaliberbox-100.svg'],
      productId: win100.id,
      scheduledAt: tomorrow,
      createdById: admin.id,
    },
  })

  // Fehlgeschlagener Post (Instagram)
  await prisma.socialMediaPost.create({
    data: {
      platform: 'instagram',
      status: 'failed',
      caption: 'Neu: Patronenboxen für .22 lfB — 50 oder 100 Schuss.',
      mediaUrls: [],
      scheduledAt: new Date(Date.now() - 60 * 60 * 1000),
      errorMessage: 'Instagram posts require at least one image',
      attempts: 1,
      lastAttemptAt: new Date(Date.now() - 55 * 60 * 1000),
      createdById: admin.id,
    },
  })
}

async function seedFilamentAms() {
  // Farben: Mindestbestand + „aktuell nicht verfügbar"
  await prisma.color.update({ where: { name: 'Sun Yellow' }, data: { minStockGrams: 500 } })
  await prisma.color.update({ where: { name: 'Brand Green' }, data: { minStockGrams: 200 } })
  await prisma.color.update({ where: { name: 'Ocean Blue' }, data: { outOfStock: true } })

  if ((await prisma.amsUnit.count()) > 0) return
  const x1c = await prisma.printer.findUniqueOrThrow({ where: { name: 'Bambu Lab X1C #1' } })
  const spools = (
    await prisma.filamentSpool.findMany({
      where: { color: { amsSlot: { not: null } } },
      include: { color: true },
    })
  ).sort((a, b) => (a.color?.amsSlot ?? 0) - (b.color?.amsSlot ?? 0))
  // Bestandsspulen mit Stammdaten anreichern (1× unter Minimum, 1× Nachbestellen)
  for (const [i, spool] of spools.entries()) {
    await prisma.filamentSpool.update({
      where: { id: spool.id },
      data: {
        manufacturer: 'Bambu Lab',
        label: `${spool.color?.name ?? spool.material} Spule #${i + 1}`,
        totalGrams: 1000,
        minRemainingGrams: i === 1 ? (spool.remainingGrams ?? 0) + 200 : 100,
        storageLocation: 'Regal A',
        reorder: i === 2,
      },
    })
  }
  const unit = await prisma.amsUnit.create({
    data: { printerId: x1c.id, name: 'AMS 2 Pro #1', position: 1, notes: 'Hauptdrucker-AMS' },
  })
  for (const [i, spool] of spools.slice(0, 4).entries()) {
    await prisma.amsSlot.create({
      data: {
        amsUnitId: unit.id,
        slotIndex: i + 1,
        status: i === 1 ? 'low' : 'loaded',
        spoolId: spool.id,
      },
    })
  }
}

async function seedProductionSchedule() {
  if ((await prisma.maintenanceWindow.count()) > 0) return
  const x1c = await prisma.printer.findUniqueOrThrow({ where: { name: 'Bambu Lab X1C #1' } })
  const a1 = await prisma.printer.findUniqueOrThrow({ where: { name: 'Bambu Lab A1 #2' } })
  const job = await prisma.printerJob.findFirst({
    where: { printerId: x1c.id, status: 'printing' },
  })
  if (job) {
    const start = new Date()
    await prisma.printerJob.update({
      where: { id: job.id },
      data: { plannedStartAt: start, plannedEndAt: new Date(start.getTime() + 180 * 60 * 1000) },
    })
  }
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  tomorrow.setUTCHours(8, 0, 0, 0)
  await prisma.maintenanceWindow.create({
    data: {
      printerId: a1.id,
      title: 'Düse tauschen (0.4 mm)',
      startsAt: tomorrow,
      endsAt: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
      notes: 'Ersatzdüse liegt bereit',
    },
  })
}

async function seedQcAndShipments() {
  if ((await prisma.qcRecord.count()) > 0) return
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: DEV_ADMIN_EMAIL } })
  const order4 = await prisma.order.findUniqueOrThrow({
    where: { orderNumber: 'PS-2026-00000004' },
    include: { items: true },
  })
  const order1 = await prisma.order.findUniqueOrThrow({
    where: { orderNumber: 'PS-2026-00000001' },
    include: { items: true },
  })
  const x1c = await prisma.printer.findUniqueOrThrow({ where: { name: 'Bambu Lab X1C #1' } })

  // Historischer Job (versendet) mit bestandener QC
  const shippedJob = await prisma.printerJob.create({
    data: {
      orderId: order4.id,
      orderItemId: order4.items[0]?.id,
      printerId: x1c.id,
      status: 'shipped',
      printDurationMinutes: 120,
      startedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      finishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000),
    },
  })
  await prisma.qcRecord.create({
    data: {
      printerJobId: shippedJob.id,
      status: 'passed',
      colorOk: true,
      surfaceOk: true,
      dimensionsOk: true,
      stabilityOk: true,
      completenessOk: true,
      packagingOk: true,
      note: 'Einwandfrei — Seed-Beispiel',
      approvedById: admin.id,
      approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  })

  // Offene QC an einem Job in der Qualitätsprüfung
  const qcJob = await prisma.printerJob.create({
    data: {
      orderId: order4.id,
      orderItemId: order4.items[1]?.id,
      status: 'quality_check',
      printDurationMinutes: 90,
    },
  })
  await prisma.qcRecord.create({
    data: { printerJobId: qcJob.id, status: 'open', colorOk: true, surfaceOk: true },
  })

  // Versand: 1 versendete Sendung (Historie) + 1 wartet auf QC
  const shipment1 = await prisma.shipment.create({
    data: {
      shipmentNumber: 'VER-2026-00001',
      orderId: order4.id,
      status: 'shipped',
      carrier: 'hermes',
      trackingNumber: 'HERMES-SEED-654321',
      packedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      shippedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      createdById: admin.id,
      items: {
        create: order4.items.map((item) => ({ orderItemId: item.id, quantity: item.quantity })),
      },
    },
  })
  await prisma.shipmentStatusEvent.createMany({
    data: [
      {
        shipmentId: shipment1.id,
        fromStatus: null,
        toStatus: 'waiting_for_qc',
        byUserId: admin.id,
      },
      {
        shipmentId: shipment1.id,
        fromStatus: 'waiting_for_qc',
        toStatus: 'ready_for_shipping',
        byUserId: admin.id,
      },
      {
        shipmentId: shipment1.id,
        fromStatus: 'ready_for_shipping',
        toStatus: 'packed',
        byUserId: admin.id,
      },
      {
        shipmentId: shipment1.id,
        fromStatus: 'packed',
        toStatus: 'shipped',
        byUserId: admin.id,
        note: 'Hermes-Abholung',
      },
    ],
  })
  const shipment2 = await prisma.shipment.create({
    data: {
      shipmentNumber: 'VER-2026-00002',
      orderId: order1.id,
      status: 'waiting_for_qc',
      createdById: admin.id,
      items: { create: [{ orderItemId: order1.items[0]!.id, quantity: 1 }] },
    },
  })
  await prisma.shipmentStatusEvent.create({
    data: {
      shipmentId: shipment2.id,
      fromStatus: null,
      toStatus: 'waiting_for_qc',
      byUserId: admin.id,
    },
  })
  await prisma.shipmentCounter.upsert({
    where: { year: 2026 },
    create: { year: 2026, lastSequence: 2 },
    update: { lastSequence: 2 },
  })
}

async function seedComplaints() {
  if ((await prisma.complaint.count()) > 0) return
  const order4 = await prisma.order.findUniqueOrThrow({
    where: { orderNumber: 'PS-2026-00000004' },
    include: { items: true },
  })
  const rimfireItem = order4.items.find((i) => i.name.includes('.22 lfB')) ?? order4.items[2]!
  await prisma.complaint.create({
    data: {
      complaintNumber: 'REK-2026-00001',
      accessToken: 'seed-complaint-token-1',
      orderId: order4.id,
      status: 'submitted',
      reason: 'quality_issue',
      description: 'Der Deckel schließt nicht sauber, an einer Ecke hat sich ein Layer gelöst.',
      items: { create: [{ orderItemId: rimfireItem.id, quantity: 1 }] },
    },
  })
  await prisma.complaintCounter.upsert({
    where: { year: 2026 },
    create: { year: 2026, lastSequence: 1 },
    update: { lastSequence: 1 },
  })
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

async function seedPortalTokens() {
  if ((await prisma.magicLinkToken.count()) > 0) return
  // Klartext-Tokens nur für Entwicklung/E2E — dokumentiert in docs/customer-portal.md
  await prisma.magicLinkToken.create({
    data: {
      email: 'kunde1@example.com',
      tokenHash: sha256('test-magic-token-kunde1'),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })
  await prisma.magicLinkToken.create({
    data: {
      email: 'kunde1@example.com',
      tokenHash: sha256('test-magic-token-expired'),
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  })
}

async function seedSavedConfigurations() {
  if ((await prisma.savedConfiguration.count()) > 0) return
  const nine50 = await seedProduct(boxSlug('9mm-luger', 50))
  const brandGreen = await prisma.color.findUniqueOrThrow({ where: { name: 'Brand Green' } })
  const neonOrange = await prisma.color.findUniqueOrThrow({
    where: { name: 'Neon Orange (ausverkauft)' },
  })
  const selection = defaultSelection(nine50)
  await prisma.savedConfiguration.create({
    data: {
      productId: nine50.id,
      selectedColors: { ...selection, zone_1_main: brandGreen.id },
      shareToken: 'seed-config-box-1',
    },
  })
  // Kombination mit inaktiver Farbe → Verfügbarkeitswarnung testbar
  await prisma.savedConfiguration.create({
    data: {
      productId: nine50.id,
      selectedColors: { ...selection, zone_1_main: neonOrange.id },
      shareToken: 'seed-config-box-2',
    },
  })
}

async function seedReviews() {
  if ((await prisma.review.count()) > 0) return
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: DEV_ADMIN_EMAIL } })
  const order4 = await prisma.order.findUniqueOrThrow({
    where: { orderNumber: 'PS-2026-00000004' },
    include: { items: { include: { product: true } } },
  })
  const itemBySlug = (slug: string) => order4.items.find((i) => i.product?.slug === slug)
  const nineItem = itemBySlug(boxSlug('9mm-luger', 50))!
  const rimfireItem = itemBySlug(boxSlug('22-lr', 50))!
  const akItem = itemBySlug(boxSlug('762x39', 50))!
  // Der .45-ACP-Posten bleibt unbewertet → E2E kann eine Bewertung abgeben.
  await prisma.review.create({
    data: {
      orderItemId: nineItem.id,
      orderId: order4.id,
      productId: nineItem.productId!,
      rating: 5,
      title: 'Passt genau',
      body: 'Die Patronen sitzen fest in den Fächern, saubere Layer und gut lesbare Beschriftung. Gerne wieder!',
      displayName: 'Anna K.',
      locale: 'de',
      status: 'approved',
      moderatedById: admin.id,
      moderatedAt: new Date(),
    },
  })
  await prisma.review.create({
    data: {
      orderItemId: rimfireItem.id,
      orderId: order4.id,
      productId: rimfireItem.productId!,
      rating: 3,
      body: 'Ordentliche Box, aber der Deckel könnte etwas strammer schließen.',
      displayName: 'Kim K.',
      locale: 'de',
      status: 'pending',
    },
  })
  await prisma.review.create({
    data: {
      orderItemId: akItem.id,
      orderId: order4.id,
      productId: akItem.productId!,
      rating: 1,
      body: 'SPAM SPAM besucht meine Website unter example-spam.tld!!!',
      displayName: 'Spammer',
      locale: 'de',
      status: 'rejected',
      flaggedAbuse: true,
      internalNote: 'Offensichtlicher Spam — abgelehnt.',
      moderatedById: admin.id,
      moderatedAt: new Date(),
    },
  })
}

async function seedVouchers() {
  if ((await prisma.voucher.count()) > 0) return
  await prisma.voucher.create({
    data: {
      code: 'TEST10',
      type: 'percent',
      value: 10,
      active: true,
      note: 'Demo-Gutschein: 10 % auf alles',
    },
  })
  await prisma.voucher.create({
    data: {
      code: 'WELCOME5',
      type: 'fixed',
      value: 500,
      active: true,
      minOrderCents: 2500,
      note: 'Demo-Gutschein: 5 € ab 25 € Bestellwert',
    },
  })
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo seed is disabled in production; use prisma:bootstrap-admin')
  }
  if (process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Demo seed refused: set ALLOW_DEMO_SEED=true for local/CI fixtures')
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('Demo seed refused: DATABASE_URL is missing')
  }
  let databaseUrl: URL
  try {
    databaseUrl = new URL(process.env.DATABASE_URL)
  } catch {
    throw new Error('Demo seed refused: DATABASE_URL is invalid')
  }
  if (!new Set(['localhost', '127.0.0.1', '[::1]']).has(databaseUrl.hostname)) {
    throw new Error(`Demo seed refused for non-local database host: ${databaseUrl.hostname}`)
  }
  console.log('Seeding roles & permissions …')
  await seedRoles()
  console.log('Seeding users …')
  await seedUsers()
  console.log('Seeding colors …')
  await seedColors()
  console.log('Seeding calibers …')
  await seedCalibers()
  console.log('Seeding products …')
  await seedProducts()
  console.log('Seeding printers & spools …')
  await seedPrinters()
  console.log('Seeding orders …')
  await seedOrders()
  await seedPortalOrder()
  await seedProductionJobs()
  console.log('Seeding quote requests …')
  await seedQuoteRequest()
  console.log('Seeding support tickets …')
  await seedTickets()
  console.log('Seeding social media posts …')
  await seedSocialPosts()
  console.log('Seeding filament & AMS …')
  await seedFilamentAms()
  console.log('Seeding production schedule …')
  await seedProductionSchedule()
  console.log('Seeding QC & shipments …')
  await seedQcAndShipments()
  console.log('Seeding complaints …')
  await seedComplaints()
  console.log('Seeding portal tokens …')
  await seedPortalTokens()
  console.log('Seeding saved configurations …')
  await seedSavedConfigurations()
  console.log('Seeding reviews …')
  await seedReviews()
  console.log('Seeding vouchers …')
  await seedVouchers()
  console.log(`Done. Admin login: ${DEV_ADMIN_EMAIL} / ${DEV_ADMIN_PASSWORD}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
