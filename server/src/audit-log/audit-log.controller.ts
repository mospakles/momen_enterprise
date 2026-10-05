import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionResource } from '@prisma/client';
import { AuditLogService } from './audit-log.service';
import { AdminJwtAuthGuard } from '../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedAdminUser } from '../auth/admin-auth/admin-jwt.strategy';
import { CreateAuditLogDto } from './create-audit-log.dto';

@ApiTags('admin-audit-log')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Permissions('audit_logs', 'view')
  findAll(
    @Query('resource') resource?: PermissionResource,
    @Query('resourceId') resourceId?: string,
    @Query('actorId') actorId?: string,
  ) {
    return this.auditLogService.findAll({ resource, resourceId, actorId });
  }

  @Post()
  create(
    @Body() dto: CreateAuditLogDto,
    @CurrentUser() user: AuthenticatedAdminUser,
  ) {
    return this.auditLogService.log({
      ...dto,
      actorId: user.id,
      actorName: user.name,
    });
  }
}
