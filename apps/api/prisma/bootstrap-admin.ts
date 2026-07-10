import process from 'node:process'
import { PrismaClient } from '@prisma/client'
import { USER_ROLES } from '@print-shop/types'
import { PERMISSIONS, ROLE_PERMISSIONS } from '@print-shop/utils'
import argon2 from 'argon2'
import { z } from 'zod'

for (const path of ['.env', '../../.env']) {
  try {
    process.loadEnvFile(path)
  } catch {
    // EnvironmentFile/shell variables are preferred; local files are convenience only.
  }
}

const input = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    name: z.string().trim().min(1).max(150),
    password: z.string().min(16).max(200),
  })
  .parse({
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    name: process.env.BOOTSTRAP_ADMIN_NAME ?? 'Admin',
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  })

if (['admin-dev-password', 'change-me-in-production'].includes(input.password)) {
  throw new Error('Refusing a known example password for the bootstrap administrator')
}

const prisma = new PrismaClient()

async function main(): Promise<void> {
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
      update: { permissions: { set: permissionKeys.map((key) => ({ key })) } },
    })
  }

  const existing = await prisma.user.findFirst({
    where: { email: { equals: input.email, mode: 'insensitive' } },
  })
  if (existing) {
    throw new Error(`Administrator bootstrap refused: ${input.email} already exists`)
  }
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } })
  await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: await argon2.hash(input.password),
      roleId: adminRole.id,
    },
  })
  console.log(`Created bootstrap administrator ${input.email}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
