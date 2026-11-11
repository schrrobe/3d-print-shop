import PDFDocument from 'pdfkit'
import { expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    shipment: { findUnique: vi.fn() },
    color: { findMany: vi.fn() },
    productColorSlot: { findMany: vi.fn() },
  },
}))

const { prisma } = await import('../src/lib/prisma.js')
const { generatePackingListPdf, generateDeliveryNotePdf } =
  await import('../src/services/shipment-flow.js')

const shipment = {
  id: 'ship_1',
  shipmentNumber: 'S-1',
  notes: null,
  order: {
    orderNumber: 'O-1',
    firstName: 'Max',
    lastName: 'Muster',
    company: null,
    street: 'Hauptstr. 1',
    zip: '10115',
    city: 'Berlin',
    country: 'DE',
    items: [],
  },
  items: [
    {
      quantity: 1,
      orderItem: {
        name: '9mm Box',
        productId: 'prod_1',
        personalization: 'Max',
        colorSelection: { zone_1_main: 'c_black' },
      },
    },
  ],
}

it('packing list prints readable colors and the print name; delivery note does not', async () => {
  vi.mocked(prisma.shipment.findUnique).mockResolvedValue(shipment as never)
  vi.mocked(prisma.color.findMany).mockResolvedValue([
    { id: 'c_black', name: 'Schwarz', hex: '#000000' },
  ] as never)
  vi.mocked(prisma.productColorSlot.findMany).mockResolvedValue([
    { productId: 'prod_1', slot: 'zone_1_main', label: 'Korpus' },
  ] as never)
  const text = vi.spyOn(PDFDocument.prototype, 'text')
  const printed = () => text.mock.calls.map((c) => String(c[0]))

  await generatePackingListPdf('ship_1')
  expect(printed()).toContain('   Korpus: Schwarz')
  expect(printed()).toContain('   Aufdruck: „Max“')
  expect(printed().join('\n')).not.toContain('c_black')

  text.mockClear()
  await generateDeliveryNotePdf('ship_1')
  expect(printed().join('\n')).not.toContain('Korpus')
  expect(printed().join('\n')).not.toContain('Aufdruck')
})

it('delivery note goes to the delivery address once support set one', async () => {
  vi.mocked(prisma.shipment.findUnique).mockResolvedValue({
    ...shipment,
    order: {
      ...shipment.order,
      deliveryAddress: {
        firstName: 'Erika',
        lastName: 'Nachbar',
        street: 'Andere Str. 9',
        zip: '20095',
        city: 'Hamburg',
        country: 'DE',
      },
    },
  } as never)
  const text = vi.spyOn(PDFDocument.prototype, 'text')
  text.mockClear()

  const pdf = await generateDeliveryNotePdf('ship_1')
  const printed = text.mock.calls.map((c) => String(c[0])).join('\n')
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
  expect(printed).toContain('Erika Nachbar')
  expect(printed).toContain('20095 Hamburg, DE')
  expect(printed).not.toContain('Hauptstr. 1')
})
