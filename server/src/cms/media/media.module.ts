import { Module } from '@nestjs/common';
import { AdminMediaController } from './admin-media.controller';
import { MediaAssetsService } from './media-assets.service';
import { ReferenceMediaController } from './reference-media.controller';

@Module({
  controllers: [AdminMediaController, ReferenceMediaController],
  providers: [MediaAssetsService],
  exports: [MediaAssetsService],
})
export class MediaModule {}
