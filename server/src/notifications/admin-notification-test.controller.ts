import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedAdminUser } from '../auth/admin-auth/admin-jwt.strategy';
import { NotificationsService } from './notifications.service';

@ApiTags('admin-notifications')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/notifications')
export class AdminNotificationTestController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('test')
  @Permissions('notifications', 'edit')
  sendTest(
    @Body('triggerId') triggerId: string,
    @CurrentUser() user: AuthenticatedAdminUser,
  ) {
    return this.notifications.sendTest(triggerId, user.email);
  }
}
