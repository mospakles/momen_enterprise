import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminUsersService } from './admin-users.service';
import { InviteAdminUserDto } from './dto/invite-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedAdminUser } from './../admin-auth/admin-jwt.strategy';

@ApiTags('admin-users')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/admin-users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @Permissions('admin_users', 'view')
  findAll() {
    return this.adminUsersService.findAll();
  }

  @Get(':id')
  @Permissions('admin_users', 'view')
  findOne(@Param('id') id: string) {
    return this.adminUsersService.findOne(id);
  }

  @Post()
  @Permissions('admin_users', 'create')
  invite(@Body() dto: InviteAdminUserDto) {
    return this.adminUsersService.invite(dto);
  }

  @Patch(':id')
  @Permissions('admin_users', 'edit')
  update(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    return this.adminUsersService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('admin_users', 'delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedAdminUser) {
    return this.adminUsersService.remove(id, user.id);
  }
}
