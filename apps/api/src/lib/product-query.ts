/** Shared Prisma include for public product responses (catalog + detail + recommendations). */
export const publicProductInclude = {
  translations: true,
  assets: { where: { type: { not: 'production_file' as const } }, orderBy: { sortOrder: 'asc' as const } },
  colorSlots: { include: { defaultColor: true } },
}
