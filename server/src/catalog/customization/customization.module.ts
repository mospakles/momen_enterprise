import { Module } from '@nestjs/common';
import {
  AdminCustomizationController,
  CustomizationController,
} from './customization.controller';
import { CustomizationService } from './customization.service';

@Module({
  controllers: [CustomizationController, AdminCustomizationController],
  providers: [CustomizationService],
  exports: [CustomizationService],
})
export class CustomizationModule {}
