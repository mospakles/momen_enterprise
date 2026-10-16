/**
 * Catalogue clean-up:
 *  1. Hides Senator Wear: the category and any product named "Senator"
 *     (set to draft, not deleted — republish in Admin if ever needed).
 *  2. Removes placeholder stock imagery (picsum, Unsplash, placeholder
 *     services) so only real outfit and accessory photography is shown:
 *     - products lose placeholder photos; a product left with none is set to
 *       draft until real photos are added in Admin → Products
 *     - categories / collections fall back to a real photo of one of their
 *       products; blog covers to a campaign photo
 *     - banners with a placeholder are switched off; testimonial and fabric
 *       placeholder photos are cleared (fabrics show as a named swatch)
 *     - placeholder entries in the media library are removed
 *
 * Safe to re-run. `--dry-run` prints what would change without writing.
 *
 *   npx ts-node -T -O '{"module":"commonjs","moduleResolution":"node"}' prisma/scripts/clean-catalog.ts --dry-run
 *   npx ts-node -T -O '{"module":"commonjs","moduleResolution":"node"}' prisma/scripts/clean-catalog.ts
 */
import { PrismaClient, PublishStatus } from '@prisma/client';

const prisma = new PrismaClient();
const dry = process.argv.includes('--dry-run');
const MOCK = /^https?:\/\/([a-z0-9-]+\.)*(picsum\.photos|unsplash\.com|placehold\.co|placeholder\.com|placehold\.it|placeimg\.com|loremflickr\.com|dummyimage\.com|lorempixel\.com)\//i;
const MOCK_ANYWHERE = new RegExp(MOCK.source.slice(1), 'i');
const isMock = (url: string | null | undefined) => Boolean(url && MOCK.test(url));
const real = (urls: string[]) => urls.filter((u) => !isMock(u));
// Campaign frames used for blog covers that only had a placeholder.
const COVERS = ['campaign-trio-onyx-beige-white', 'campaign-ivory-kaftan-white-agbada', 'campaign-linen-couple', 'campaign-trio-grey-beige-olive', 'campaign-trio-with-ankara'].map((n) => `/images/brand/${n}.jpg`);

const log = (msg: string) => console.log(`${dry ? '[dry run] ' : ''}${msg}`);
async function write(fn: () => Promise<unknown>) {
  if (!dry) await fn();
}

async function main() {
  // 1. Senator Wear
  const senator = await prisma.category.findMany({ where: { slug: 'senator', publishStatus: PublishStatus.published } });
  for (const c of senator) {
    await write(() => prisma.category.update({ where: { id: c.id }, data: { publishStatus: PublishStatus.draft } }));
    log(`category ${c.slug} ("${c.name}") set to draft`);
  }
  // …and senator pieces filed under other categories (e.g. a senator trouser).
  const senatorPieces = await prisma.product.findMany({ where: { name: { contains: 'senator', mode: 'insensitive' }, publishStatus: PublishStatus.published }, select: { id: true, slug: true } });
  for (const p of senatorPieces) {
    await write(() => prisma.product.update({ where: { id: p.id }, data: { publishStatus: PublishStatus.draft } }));
    log(`product ${p.slug}: senator wear — set to draft`);
  }

  // 2a. Products and their colour variants
  const products = await prisma.product.findMany({ select: { id: true, slug: true, images: true, hoverImage: true, publishStatus: true, colorVariants: { select: { id: true, images: true } } } });
  const firstPhoto = new Map<string, string>();
  for (const p of products) {
    const images = real(p.images);
    const variants = p.colorVariants.filter((v) => v.images.some(isMock));
    const changed = images.length !== p.images.length || isMock(p.hoverImage) || variants.length > 0;
    if (images[0]) firstPhoto.set(p.id, images[0]);
    if (!changed) continue;
    const hide = images.length === 0 && p.publishStatus === PublishStatus.published;
    await write(async () => {
      await prisma.product.update({
        where: { id: p.id },
        data: { images, hoverImage: isMock(p.hoverImage) ? (images[1] ?? null) : undefined, ...(hide ? { publishStatus: PublishStatus.draft } : {}) },
      });
      for (const v of variants) await prisma.productColorVariant.update({ where: { id: v.id }, data: { images: real(v.images) } });
    });
    log(`product ${p.slug}: removed ${p.images.length - images.length} placeholder photo(s)${hide ? ' — no real photos left, set to draft' : ''}`);
  }

  // 2b. Categories and collections: use a real photo of one of their products
  const categories = await prisma.category.findMany({ select: { id: true, slug: true, image: true, products: { select: { id: true } } } });
  for (const c of categories.filter((c) => isMock(c.image))) {
    const image = c.products.map((p) => firstPhoto.get(p.id)).find(Boolean) ?? null;
    await write(() => prisma.category.update({ where: { id: c.id }, data: { image } }));
    log(`category ${c.slug}: placeholder image → ${image ?? 'none'}`);
  }
  const collections = await prisma.collection.findMany({ select: { id: true, slug: true, image: true, products: { select: { productId: true } } } });
  for (const c of collections.filter((c) => isMock(c.image))) {
    const image = c.products.map((p) => firstPhoto.get(p.productId)).find(Boolean) ?? COVERS[0];
    await write(() => prisma.collection.update({ where: { id: c.id }, data: { image } }));
    log(`collection ${c.slug}: placeholder image → ${image}`);
  }

  // 2c. Editorial content
  const posts = await prisma.blogPost.findMany({ where: { coverImage: { contains: '://' } }, select: { id: true, slug: true, coverImage: true } });
  let cover = 0;
  for (const post of posts.filter((p) => isMock(p.coverImage))) {
    const image = COVERS[cover++ % COVERS.length];
    await write(() => prisma.blogPost.update({ where: { id: post.id }, data: { coverImage: image } }));
    log(`journal post ${post.slug}: placeholder cover → ${image}`);
  }
  const banners = await prisma.banner.findMany({ select: { id: true, title: true, image: true, active: true } });
  for (const b of banners.filter((b) => isMock(b.image) && b.active)) {
    await write(() => prisma.banner.update({ where: { id: b.id }, data: { active: false } }));
    log(`banner "${b.title}": placeholder image — switched off (add a real photo in Admin → Banners to turn it back on)`);
  }
  const testimonials = await prisma.testimonial.findMany({ select: { id: true, image: true } });
  for (const t of testimonials.filter((t) => isMock(t.image))) {
    await write(() => prisma.testimonial.update({ where: { id: t.id }, data: { image: null } }));
    log(`testimonial ${t.id}: placeholder photo cleared`);
  }
  const fabrics = await prisma.fabric.findMany({ select: { id: true, name: true, image: true } });
  for (const f of fabrics.filter((f) => isMock(f.image))) {
    await write(() => prisma.fabric.update({ where: { id: f.id }, data: { image: '' } }));
    log(`fabric "${f.name}": placeholder photo cleared (shown as a named swatch)`);
  }
  const media = await prisma.mediaAsset.findMany({ select: { id: true, url: true } });
  const mockMedia = media.filter((m) => isMock(m.url));
  if (mockMedia.length) {
    await write(() => prisma.mediaAsset.deleteMany({ where: { id: { in: mockMedia.map((m) => m.id) } } }));
    log(`media library: removed ${mockMedia.length} placeholder entr${mockMedia.length === 1 ? 'y' : 'ies'}`);
  }

  // Homepage sections hold free-form JSON; report rather than rewrite.
  const sections = await prisma.homepageSection.findMany({ select: { id: true, type: true, content: true } });
  for (const s of sections.filter((s) => MOCK_ANYWHERE.test(JSON.stringify(s.content)))) {
    log(`homepage section ${s.type} (${s.id}) references a placeholder image — edit it in Admin → Homepage`);
  }
  log('done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
