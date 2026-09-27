import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationTriggersService } from './notification-triggers.service';
import { UpdateTriggerDto } from './dto/update-trigger.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('admin-notification-triggers')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/notification-triggers')
export class AdminNotificationTriggersController {
  constructor(private readonly service: NotificationTriggersService) {}

  @Get()
  @Permissions('notifications', 'view')
  findAll() {
    return this.service.findAll();
  }

  @Put(':id')
  @Permissions('notifications', 'edit')
  update(@Param('id') id: string, @Body() dto: UpdateTriggerDto) {
    return this.service.update(id, dto);
  }
}
