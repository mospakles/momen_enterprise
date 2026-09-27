import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { UpsertRoleDto } from './dto/upsert-role.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedAdminUser } from '../admin-auth/admin-jwt.strategy';

@ApiTags('admin-roles')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('admin_users', 'view')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Permissions('admin_users', 'view')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @Permissions('admin_users', 'create')
  create(
    @Body() dto: UpsertRoleDto,
    @CurrentUser() user: AuthenticatedAdminUser,
  ) {
    return this.rolesService.create(dto, { id: user.id, name: user.name });
  }

  @Put(':id')
  @Permissions('admin_users', 'edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpsertRoleDto,
    @CurrentUser() user: AuthenticatedAdminUser,
  ) {
    return this.rolesService.update(id, dto, { id: user.id, name: user.name });
  }

  @Delete(':id')
  @Permissions('admin_users', 'delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedAdminUser) {
    return this.rolesService.remove(id, { id: user.id, name: user.name });
  }
}
