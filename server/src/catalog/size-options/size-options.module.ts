import { Module } from '@nestjs/common';
import {
  AdminSizeOptionsController,
  SizeOptionsController,
} from './size-options.controller';
import { SizeOptionsService } from './size-options.service';

@Module({
  controllers: [SizeOptionsController, AdminSizeOptionsController],
  providers: [SizeOptionsService],
  exports: [SizeOptionsService],
})
export class SizeOptionsModule {}
