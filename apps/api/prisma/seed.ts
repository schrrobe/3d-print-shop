import { PrismaClient } from '@prisma/client'
import { PERMISSIONS, ROLE_PERMISSIONS } from '@print-shop/utils'
import { USER_ROLES } from '@print-shop/types'
import argon2 from 'argon2'

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
    { name: 'Brand Green', hex: '#31a871', material: 'PLA', manufacturer: 'Bambu Lab', amsSlot: 1, stockGrams: 800 },
    { name: 'Deep Black', hex: '#171717', material: 'PLA', manufacturer: 'Bambu Lab', amsSlot: 2, stockGrams: 950 },
    { name: 'Warm White', hex: '#f6f3ec', material: 'PLA', manufacturer: 'Bambu Lab', amsSlot: 3, stockGrams: 620 },
    { name: 'Signal Red', hex: '#d23f31', material: 'PLA', manufacturer: 'Polymaker', amsSlot: 4, stockGrams: 400 },
    { name: 'Ocean Blue', hex: '#1f6fb2', material: 'PETG', manufacturer: 'Prusament', stockGrams: 700 },
    { name: 'Sun Yellow', hex: '#e8b71a', material: 'PLA', manufacturer: 'Polymaker', stockGrams: 300 },
    { name: 'Slate Grey', hex: '#5e5e5e', material: 'PETG', manufacturer: 'Prusament', stockGrams: 550 },
    { name: 'Neon Orange (ausverkauft)', hex: '#ff6a00', material: 'PLA', manufacturer: 'Polymaker', active: false, stockGrams: 0 },
  ]
  for (const color of colors) {
    await prisma.color.upsert({ where: { name: color.name }, create: color, update: color })
  }
}

interface SeedProduct {
  slug: string
  priceCents: number
  de: { name: string; description: string }
  en: { name: string; description: string }
  slots: { slot: 'zone_1_main' | 'zone_2_accent' | 'zone_3_detail' | 'zone_4_text'; label: string; defaultColor: string }[]
}

async function seedProducts() {
  const colorIds = new Map(
    (await prisma.color.findMany()).map((c) => [c.name, c.id]),
  )
  const products: SeedProduct[] = [
    {
      slug: 'spiral-vase',
      priceCents: 2499,
      de: { name: 'Spiralvase', description: 'Elegante Spiralvase im Vasenmodus gedruckt — wasserdicht versiegelt, perfekt für Trockenblumen.' },
      en: { name: 'Spiral Vase', description: 'Elegant spiral vase printed in vase mode — sealed watertight, perfect for dried flowers.' },
      slots: [
        { slot: 'zone_1_main', label: 'Korpus', defaultColor: 'Brand Green' },
        { slot: 'zone_2_accent', label: 'Sockel', defaultColor: 'Deep Black' },
      ],
    },
    {
      slug: 'desk-organizer',
      priceCents: 3999,
      de: { name: 'Schreibtisch-Organizer', description: 'Modularer Organizer mit Stiftehalter, Kartenfach und Handy-Ablage. In vier Farbzonen individualisierbar.' },
      en: { name: 'Desk Organizer', description: 'Modular organizer with pen holder, card slot and phone stand. Customizable in four color zones.' },
      slots: [
        { slot: 'zone_1_main', label: 'Basis', defaultColor: 'Deep Black' },
        { slot: 'zone_2_accent', label: 'Einsätze', defaultColor: 'Brand Green' },
        { slot: 'zone_3_detail', label: 'Details', defaultColor: 'Warm White' },
        { slot: 'zone_4_text', label: 'Beschriftung', defaultColor: 'Sun Yellow' },
      ],
    },
    {
      slug: 'planetary-gear-toy',
      priceCents: 1899,
      de: { name: 'Planetengetriebe-Fidget', description: 'Voll funktionsfähiges Planetengetriebe zum Spielen — print-in-place, sofort beweglich.' },
      en: { name: 'Planetary Gear Fidget', description: 'Fully functional planetary gear fidget — print-in-place, moving right off the bed.' },
      slots: [
        { slot: 'zone_1_main', label: 'Gehäuse', defaultColor: 'Slate Grey' },
        { slot: 'zone_2_accent', label: 'Zahnräder', defaultColor: 'Signal Red' },
        { slot: 'zone_3_detail', label: 'Sonnenrad', defaultColor: 'Sun Yellow' },
      ],
    },
    {
      slug: 'wall-hook-set',
      priceCents: 1299,
      de: { name: 'Wandhaken-Set (3 Stück)', description: 'Belastbare Wandhaken mit verdeckter Verschraubung, bis 5 kg pro Haken.' },
      en: { name: 'Wall Hook Set (3 pcs)', description: 'Sturdy wall hooks with hidden screw mount, up to 5 kg per hook.' },
      slots: [{ slot: 'zone_1_main', label: 'Haken', defaultColor: 'Warm White' }],
    },
  ]

  for (const p of products) {
    const translations = [
      { locale: 'de' as const, name: p.de.name, description: p.de.description, seoTitle: `${p.de.name} — 3D-Druck`, seoDescription: p.de.description.slice(0, 160) },
      { locale: 'en' as const, name: p.en.name, description: p.en.description, seoTitle: `${p.en.name} — 3D print`, seoDescription: p.en.description.slice(0, 160) },
    ]
    const colorSlots = p.slots.map((s) => ({
      slot: s.slot,
      label: s.label,
      defaultColorId: colorIds.get(s.defaultColor) ?? null,
    }))
    const assets = [
      { type: 'image' as const, url: `/images/products/${p.slug}.svg`, alt: p.en.name, sortOrder: 0 },
      { type: 'glb_preview' as const, url: `/models/${p.slug}.glb`, alt: null, sortOrder: 1 },
    ]

    const existing = await prisma.product.findUnique({ where: { slug: p.slug } })
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: { priceCents: p.priceCents, active: true },
      })
      continue
    }
    await prisma.product.create({
      data: {
        slug: p.slug,
        priceCents: p.priceCents,
        active: true,
        translations: { create: translations },
        colorSlots: { create: colorSlots },
        assets: { create: assets },
      },
    })
  }
}

async function seedPrinters() {
  const printers = [
    { name: 'Bambu Lab X1C #1', model: 'Bambu Lab X1 Carbon + AMS 2 Pro', status: 'idle' as const, notes: 'Hauptdrucker, AMS 2 Pro mit 4 Slots' },
    { name: 'Bambu Lab A1 #2', model: 'Bambu Lab A1', status: 'maintenance' as const, notes: 'Düse 0.4 verstopft — Wartung geplant' },
  ]
  for (const p of printers) {
    await prisma.printer.upsert({ where: { name: p.name }, create: p, update: {} })
  }

  const x1c = await prisma.printer.findUniqueOrThrow({ where: { name: 'Bambu Lab X1C #1' } })
  const colors = await prisma.color.findMany({ where: { amsSlot: { not: null } } })
  const existingSpools = await prisma.filamentSpool.count({ where: { printerId: x1c.id } })
  if (existingSpools === 0) {
    for (const color of colors) {
      await prisma.filamentSpool.create({
        data: {
          printerId: x1c.id,
          amsSlot: color.amsSlot,
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
  const vase = await prisma.product.findUniqueOrThrow({
    where: { slug: 'spiral-vase' },
    include: { colorSlots: true },
  })
  const organizer = await prisma.product.findUniqueOrThrow({
    where: { slug: 'desk-organizer' },
    include: { colorSlots: true },
  })

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
      subtotalCents: 4998,
      shippingCents: 699,
      totalCents: 5697,
      items: {
        create: [
          {
            productId: vase.id,
            name: 'Spiralvase',
            quantity: 2,
            unitPriceCents: 2499,
            colorSelection: { zone_1_main: vase.colorSlots[0]?.defaultColorId ?? '' },
          },
        ],
      },
      payments: {
        create: [{ method: 'stripe', status: 'paid', amountCents: 5697, paidAt: new Date() }],
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
      subtotalCents: 3999,
      shippingCents: 699,
      totalCents: 4698,
      items: {
        create: [
          {
            productId: organizer.id,
            name: 'Desk Organizer',
            quantity: 1,
            unitPriceCents: 3999,
            colorSelection: {},
          },
        ],
      },
      payments: {
        create: [
          { method: 'bank_transfer', status: 'pending', amountCents: 4698, reference: 'PS-2026-00000002' },
        ],
      },
    },
  })

  // 3: free-shipping order, shipped
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
      subtotalCents: 15996,
      shippingCents: 0,
      totalCents: 15996,
      carrier: 'dhl',
      trackingNumber: 'DHL-SEED-123456',
      shippedAt: new Date(),
      items: {
        create: [
          {
            productId: organizer.id,
            name: 'Schreibtisch-Organizer',
            quantity: 4,
            unitPriceCents: 3999,
            colorSelection: {},
          },
        ],
      },
      payments: {
        create: [{ method: 'bitcoin', status: 'paid', amountCents: 15996, paidAt: new Date() }],
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
      spoolNotes: 'AMS Slot 1: Brand Green, Slot 2: Deep Black',
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
      description: 'Ersatzteil für eine Küchenmaschine, Material sollte lebensmittelecht sein (PETG).',
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
            body: 'Hallo, ist das Wandregal auch in PETG statt PLA druckbar? Es soll ins Badezimmer.',
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

async function main() {
  console.log('Seeding roles & permissions …')
  await seedRoles()
  console.log('Seeding users …')
  await seedUsers()
  console.log('Seeding colors …')
  await seedColors()
  console.log('Seeding products …')
  await seedProducts()
  console.log('Seeding printers & spools …')
  await seedPrinters()
  console.log('Seeding orders …')
  await seedOrders()
  await seedProductionJobs()
  console.log('Seeding quote requests …')
  await seedQuoteRequest()
  console.log('Seeding support tickets …')
  await seedTickets()
  console.log(`Done. Admin login: ${DEV_ADMIN_EMAIL} / ${DEV_ADMIN_PASSWORD}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
