import { Module } from '@nestjs/common';
import {
  AdminColorSwatchesController,
  ColorSwatchesController,
} from './color-swatches.controller';
import { ColorSwatchesService } from './color-swatches.service';

@Module({
  controllers: [ColorSwatchesController, AdminColorSwatchesController],
  providers: [ColorSwatchesService],
  exports: [ColorSwatchesService],
})
export class ColorSwatchesModule {}
