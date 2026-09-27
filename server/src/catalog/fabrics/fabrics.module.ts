import { Module } from '@nestjs/common';
import {
  AdminFabricsController,
  FabricsController,
} from './fabrics.controller';
import { FabricsService } from './fabrics.service';

@Module({
  controllers: [FabricsController, AdminFabricsController],
  providers: [FabricsService],
  exports: [FabricsService],
})
export class FabricsModule {}
