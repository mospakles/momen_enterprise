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
import { NavigationService } from './navigation.service';
import { UpsertNavigationItemDto } from './dto/upsert-navigation-item.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('admin-navigation')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/navigation')
export class AdminNavigationController {
  constructor(private readonly service: NavigationService) {}

  @Get()
  @Permissions('content', 'view')
  findAll() {
    return this.service.findAllAdmin();
  }

  @Post()
  @Permissions('content', 'create')
  create(@Body() dto: UpsertNavigationItemDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Permissions('content', 'edit')
  update(@Param('id') id: string, @Body() dto: UpsertNavigationItemDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('content', 'delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
