import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { MediaAssetsService } from './media-assets.service';
import { referenceImageMulterOptions } from './media-storage.config';

/**
 * Stores a deliberately constrained image reference while a shopper builds a
 * custom garment. It is public so guest checkout remains possible; opaque
 * filenames, image-only validation, a 2MB limit and the global rate limiter
 * keep the endpoint bounded.
 */
@ApiTags('custom-order-references')
@Public()
@Controller('custom-order-references')
export class ReferenceMediaController {
  constructor(private readonly media: MediaAssetsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', referenceImageMulterOptions))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('alt') alt?: string,
  ) {
    if (!file) throw new BadRequestException('An image file is required');
    return this.media.create(file, 'customer-references', alt, undefined, 'Customer');
  }
}
