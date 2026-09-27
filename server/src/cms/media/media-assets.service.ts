import { Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { MediaAssetType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MEDIA_UPLOAD_DIR } from './media-storage.config';

@Injectable()
export class MediaAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(folder?: string) {
    return this.prisma.mediaAsset.findMany({
      where: folder ? { folder } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Media asset not found');
    return asset;
  }

  create(
    file: Express.Multer.File,
    folder: string | undefined,
    alt: string | undefined,
    uploadedById: string | undefined,
    uploadedByName: string,
  ) {
    return this.prisma.mediaAsset.create({
      data: {
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        // TODO: extract real width/height for images — needs an image
        // processing lib (e.g. sharp), not currently a dependency.
        type: file.mimetype.startsWith('video/')
          ? MediaAssetType.video
          : MediaAssetType.image,
        folder: folder ?? 'uncategorized',
        size: file.size,
        alt,
        uploadedById,
        uploadedByName,
      },
    });
  }

  async remove(id: string) {
    const asset = await this.findOne(id);
    await this.prisma.mediaAsset.delete({ where: { id } });
    // Best-effort — an asset row shouldn't become undeletable just because
    // its file already vanished from disk some other way.
    await unlink(
      join(MEDIA_UPLOAD_DIR, asset.url.replace('/uploads/', '')),
    ).catch(() => undefined);
  }
}
