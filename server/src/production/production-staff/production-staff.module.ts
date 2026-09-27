import { Module } from '@nestjs/common';
import { ProductionStaffController } from './production-staff.controller';
import { ProductionStaffService } from './production-staff.service';

@Module({
  controllers: [ProductionStaffController],
  providers: [ProductionStaffService],
  exports: [ProductionStaffService],
})
export class ProductionStaffModule {}
