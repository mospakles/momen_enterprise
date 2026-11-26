import type { PrismaClient } from '@prisma/client';

/**
 * Which measurements each bespoke style asks for, grouped by the storefront
 * into robe / top / trousers. Starting values only: a category that already
 * has measurements configured (Admin → Categories) is never changed.
 * Kept in step with migrations 20261114220000_measurement_guide_fields and
 * 20261125130000_sleeve_options.
 */
const TOP = [
  'neck', 'shoulder', 'chest', 'stomach',
  'sleeveShort', 'sleeveThreeQuarter', 'sleeveLength', 'bicep', 'roundSleeveThreeQuarter', 'roundSleeveLong',
  'length',
];
const TROUSERS = ['waist', 'hip', 'thigh', 'trouserLength', 'ankle'];
export const STYLE_MEASUREMENTS: Record<string, string[]> = {
  agbada: ['agbadaLength', 'agbadaWidth', ...TOP, ...TROUSERS],
  kaftans: [...TOP, ...TROUSERS],
  senator: [...TOP, ...TROUSERS],
  jalabia: TOP,
  shirts: TOP,
  pants: TROUSERS,
};

export async function linkStyleMeasurements(prisma: PrismaClient) {
  const defined = new Set((await prisma.measurementFieldDef.findMany({ select: { key: true } })).map((d) => d.key));
  for (const [slug, keys] of Object.entries(STYLE_MEASUREMENTS)) {
    const category = await prisma.category.findUnique({
      where: { slug },
      select: { id: true, _count: { select: { measurementFieldDefs: true } } },
    });
    if (!category || category._count.measurementFieldDefs > 0) continue;
    const connect = keys.filter((key) => defined.has(key)).map((key) => ({ key }));
    if (!connect.length) continue;
    await prisma.category.update({ where: { id: category.id }, data: { measurementFieldDefs: { connect } } });
    console.log(`Linked ${connect.length} measurements to the ${slug} category`);
  }
}
