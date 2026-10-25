import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'

// BoxLoc ammo boxes (Layer51, commercially licensed) — safe for dev and prod:
// creates missing products inactive, never touches existing ones.
//   docker exec kaliberbox-api-<env> node_modules/.bin/tsx prisma/seed-products.ts

for (const path of ['.env', '../../.env']) {
  try {
    process.loadEnvFile(path)
  } catch {
    // EnvironmentFile/shell variables are preferred; local files are convenience only.
  }
}

type SeedProduct = {
  slug: string
  priceCents: number
  de: { name: string; description: string }
  en: { name: string; description: string }
  images: string[]
}

const products: SeedProduct[] = JSON.parse(
  await readFile(path.join(import.meta.dirname, 'seed-products.json'), 'utf8'),
)
const productImagesDir = path.resolve(process.env.UPLOAD_DIR ?? './uploads', 'products')
const prisma = new PrismaClient()

async function downloadImage(url: string, filename: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Image download failed (${res.status}): ${url}`)
  const webp = await sharp(Buffer.from(await res.arrayBuffer()))
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer()
  await writeFile(path.join(productImagesDir, filename), webp)
}

function translation(locale: 'de' | 'en', t: SeedProduct['de']) {
  return {
    locale,
    name: t.name,
    description: t.description,
    seoTitle: t.name.slice(0, 70),
    seoDescription: t.description.slice(0, 160),
  }
}

async function main(): Promise<void> {
  await mkdir(productImagesDir, { recursive: true })
  const colorIds = new Map((await prisma.color.findMany()).map((c) => [c.name, c.id]))
  let created = 0

  for (const p of products) {
    if (await prisma.product.findUnique({ where: { slug: p.slug } })) {
      console.log(`skip   ${p.slug}`)
      continue
    }
    // Deterministic filenames: a rerun after a failure overwrites instead of piling up.
    const filenames = p.images.map((_, i) => `${p.slug}_${i + 1}.webp`)
    for (const [i, url] of p.images.entries()) await downloadImage(url, filenames[i]!)

    await prisma.product.create({
      data: {
        slug: p.slug,
        priceCents: p.priceCents,
        active: false,
        translations: { create: [translation('de', p.de), translation('en', p.en)] },
        colorSlots: {
          create: [
            {
              slot: 'zone_1_main',
              label: 'Box',
              defaultColorId: colorIds.get('Deep Black') ?? null,
            },
            {
              slot: 'zone_2_accent',
              label: 'Verschluss',
              defaultColorId: colorIds.get('Warm White') ?? null,
            },
          ],
        },
        assets: {
          create: filenames.map((filename, i) => ({
            type: 'image' as const,
            url: `/api/product-images/${filename}`,
            alt: `${p.de.name} Bild ${i + 1}`,
            sortOrder: i + 1,
          })),
        },
      },
    })
    created++
    console.log(`create ${p.slug}`)
  }
  console.log(
    `Done: ${created} created, ${products.length - created} skipped (all new ones inactive)`,
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
