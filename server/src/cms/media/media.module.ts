import { Module } from '@nestjs/common';
import { AdminMediaController } from './admin-media.controller';
import { MediaAssetsService } from './media-assets.service';

@Module({
  controllers: [AdminMediaController],
  providers: [MediaAssetsService],
  exports: [MediaAssetsService],
})
export class MediaModule {}
