import { Module } from '@nestjs/common';
import { CollectionsController } from './collections.controller';
import { AdminCollectionsController } from './admin-collections.controller';
import { CollectionsService } from './collections.service';

@Module({
  controllers: [CollectionsController, AdminCollectionsController],
  providers: [CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
