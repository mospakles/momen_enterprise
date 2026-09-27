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
import { BannersService } from './banners.service';
import { UpsertBannerDto } from './dto/upsert-banner.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('admin-banners')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/banners')
export class AdminBannersController {
  constructor(private readonly service: BannersService) {}

  @Get()
  @Permissions('content', 'view')
  findAll() {
    return this.service.findAllAdmin();
  }

  @Post()
  @Permissions('content', 'create')
  create(@Body() dto: UpsertBannerDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Permissions('content', 'edit')
  update(@Param('id') id: string, @Body() dto: UpsertBannerDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('content', 'delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
