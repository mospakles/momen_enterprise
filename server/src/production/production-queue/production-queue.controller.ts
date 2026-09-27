import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProductionQueueService } from './production-queue.service';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('admin-production-queue')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/production-queue')
export class ProductionQueueController {
  constructor(private readonly service: ProductionQueueService) {}

  @Get()
  @Permissions('production', 'view')
  findQueue(
    @Query('assignedStaffId') assignedStaffId?: string,
    @Query('overdueOnly') overdueOnly?: string,
  ) {
    return this.service.findQueue({
      assignedStaffId,
      overdueOnly: overdueOnly === 'true',
    });
  }
}
