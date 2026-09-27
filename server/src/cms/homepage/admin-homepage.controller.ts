import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HomepageService } from './homepage.service';
import { UpsertHomepageSectionDto } from './dto/upsert-homepage-section.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('admin-homepage')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/homepage-sections')
export class AdminHomepageController {
  constructor(private readonly service: HomepageService) {}

  @Get()
  @Permissions('content', 'view')
  findAll() {
    return this.service.findAllAdmin();
  }

  @Post()
  @Permissions('content', 'create')
  create(@Body() dto: UpsertHomepageSectionDto) {
    return this.service.create(dto);
  }

  @Patch('reorder')
  @Permissions('content', 'edit')
  reorder(@Body() dto: ReorderSectionsDto) {
    return this.service.reorder(dto.orderedIds);
  }

  @Put(':id')
  @Permissions('content', 'edit')
  update(@Param('id') id: string, @Body() dto: UpsertHomepageSectionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('content', 'delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
