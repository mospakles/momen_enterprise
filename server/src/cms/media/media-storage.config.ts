import { BadRequestException } from '@nestjs/common';
// MulterOptions isn't re-exported from the package root — only
// MulterModuleOptions (for the global MulterModule) is. This is the
// per-interceptor options type FileInterceptor(name, options) expects.
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { diskStorage } from 'multer';

export const MEDIA_UPLOAD_DIR = join(process.cwd(), 'uploads');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'video/mp4',
  'video/webm',
]);
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const REFERENCE_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

export const mediaMulterOptions: MulterOptions = {
  storage: diskStorage({
    destination: MEDIA_UPLOAD_DIR,
    // Never trust the original filename — no path traversal, no collisions,
    // no leaking the uploader's local file paths.
    filename: (_req, file, callback) =>
      callback(
        null,
        `${randomUUID()}${extname(file.originalname).toLowerCase()}`,
      ),
  }),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(
        new BadRequestException(`Unsupported file type "${file.mimetype}"`),
        false,
      );
      return;
    }
    callback(null, true);
  },
};

/** Customer customization references are intentionally image-only and small. */
export const referenceImageMulterOptions: MulterOptions = {
  storage: mediaMulterOptions.storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!REFERENCE_IMAGE_MIME_TYPES.has(file.mimetype)) {
      callback(new BadRequestException(`Unsupported image type "${file.mimetype}"`), false);
      return;
    }
    callback(null, true);
  },
};
