import { PrismaClient, PublishStatus } from '@prisma/client';
import { policyPages } from '../policy-pages';

// Publishes the shipping, returns, privacy and terms pages. A page that
// already exists is left alone (it may have been edited in Admin → Pages)
// unless --force is passed.
//
//   node dist/prisma/scripts/publish-policies.js --apply
//   node dist/prisma/scripts/publish-policies.js --apply --force   (overwrite existing pages)

async function main(apply: boolean, force: boolean) {
  const prisma = new PrismaClient();
  try {
    for (const page of policyPages) {
      const existing = await prisma.cMSPage.findUnique({ where: { slug: page.slug }, select: { id: true } });
      if (existing && !force) {
        console.log(`Skipped ${page.slug}: already exists (use --force to replace it).`);
        continue;
      }
      if (!apply) {
        console.log(`Would ${existing ? 'replace' : 'publish'} /${page.slug}: ${page.title}`);
        continue;
      }
      const data = {
        title: page.title,
        body: page.body,
        status: PublishStatus.published,
        publishAt: null,
        seo: { title: page.title, description: page.description },
      };
      await prisma.cMSPage.upsert({ where: { slug: page.slug }, update: data, create: { slug: page.slug, ...data } });
      console.log(`Published /${page.slug}: ${page.title}`);
    }
    if (!apply) console.log('\nDry run, nothing changed. Run again with --apply.');
  } finally {
    await prisma.$disconnect();
  }
}

main(process.argv.includes('--apply'), process.argv.includes('--force')).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Publishing the policy pages failed.');
  process.exitCode = 1;
});
