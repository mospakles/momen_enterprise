import { PublishStatus } from '@prisma/client';

/** Shared by every `PublishStatus`-bearing model (Product, Category,
 * Collection, CMSPage, BlogPost) — content with status "scheduled" becomes
 * visible the moment `publishAt` passes, with no separate cron/publish step
 * required. This is what the cross-cutting "no separate publish step"
 * requirement means in practice for scheduled content. */
export function isEffectivelyPublished(entity: {
  publishStatus: PublishStatus;
  publishAt: Date | null;
}): boolean {
  if (entity.publishStatus === 'published') return true;
  if (entity.publishStatus === 'scheduled' && entity.publishAt)
    return entity.publishAt.getTime() <= Date.now();
  return false;
}
