/**
 * Points products at momen. brand photography (served by the storefront from
 * public/images/brand). Saves the previous images to brand-photos.backup.json
 * first; run with `--revert` to restore them.
 *
 *   npx ts-node prisma/scripts/apply-brand-photos.ts
 *   npx ts-node prisma/scripts/apply-brand-photos.ts --revert
 */
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
// Resolved from the working directory (the server folder locally, /app on
// Railway) rather than __dirname, so it runs as CommonJS or ES module alike.
const scriptsDir = join(process.cwd(), 'prisma', 'scripts');
const mapping = JSON.parse(readFileSync(join(scriptsDir, 'brand-photos.json'), 'utf8')) as Record<
  string,
  string[] | string | Record<string, string>
>;
const backupPath = join(scriptsDir, 'brand-photos.backup.json');
const url = (name: string) => `/images/brand/${name}.jpg`;

async function apply() {
  const backup: Record<string, { images: string[]; hoverImage: string | null }> = existsSync(backupPath)
    ? JSON.parse(readFileSync(backupPath, 'utf8'))
    : {};
  let updated = 0;
  for (const [slug, names] of Object.entries(mapping)) {
    if (slug.startsWith('_') || !Array.isArray(names)) continue;
    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) {
      console.log(`skip ${slug} (not in this database)`);
      continue;
    }
    // Keep the very first backup — re-running must not overwrite the originals.
    backup[slug] ??= { images: product.images, hoverImage: product.hoverImage };
    await prisma.product.update({
      where: { slug },
      data: { images: names.map(url), hoverImage: names[1] ? url(names[1]) : null },
    });
    updated++;
  }
  // Collection and category hero images (keys prefixed in the backup).
  const imageBackup = backup as unknown as Record<string, { image: string | null }>;
  let others = 0;
  for (const [slug, name] of Object.entries((mapping._collections ?? {}) as Record<string, string>)) {
    const row = await prisma.collection.findUnique({ where: { slug } });
    if (!row) continue;
    imageBackup[`collection:${slug}`] ??= { image: row.image };
    await prisma.collection.update({ where: { slug }, data: { image: url(name) } });
    others++;
  }
  for (const [slug, name] of Object.entries((mapping._categories ?? {}) as Record<string, string>)) {
    const row = await prisma.category.findUnique({ where: { slug } });
    if (!row) continue;
    imageBackup[`category:${slug}`] ??= { image: row.image };
    await prisma.category.update({ where: { slug }, data: { image: url(name) } });
    others++;
  }
  writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`updated ${updated} products and ${others} collections/categories; backup in ${backupPath}`);
}

async function revert() {
  if (!existsSync(backupPath)) throw new Error('No backup found');
  const backup = JSON.parse(readFileSync(backupPath, 'utf8')) as Record<string, { images: string[]; hoverImage: string | null }>;
  for (const [key, prev] of Object.entries(backup)) {
    const [kind, slug] = key.includes(':') ? key.split(':') : ['product', key];
    const run =
      kind === 'collection'
        ? prisma.collection.update({ where: { slug }, data: prev as unknown as { image: string } })
        : kind === 'category'
          ? prisma.category.update({ where: { slug }, data: prev as unknown as { image: string } })
          : prisma.product.update({ where: { slug }, data: prev });
    await run.catch(() => console.log(`skip ${key}`));
  }
  console.log(`restored ${Object.keys(backup).length} products`);
}

(process.argv.includes('--revert') ? revert() : apply())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
