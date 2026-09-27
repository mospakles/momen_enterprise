import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationStatus } from '@prisma/client';
import { NotificationLogService } from './notification-log.service';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('admin-notification-log')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/notification-log')
export class AdminNotificationLogController {
  constructor(private readonly service: NotificationLogService) {}

  @Get()
  @Permissions('notifications', 'view')
  findAll(
    @Query('triggerId') triggerId?: string,
    @Query('status') status?: NotificationStatus,
  ) {
    return this.service.findAll({ triggerId, status });
  }
}
