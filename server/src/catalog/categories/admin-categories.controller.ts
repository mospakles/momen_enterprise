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
import { CategoriesService } from './categories.service';
import { UpsertCategoryDto } from './dto/upsert-category.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('admin-categories')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Permissions('collections', 'view')
  findAll() {
    return this.categoriesService.findAllAdmin();
  }

  @Get(':id')
  @Permissions('collections', 'view')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @Permissions('collections', 'create')
  create(@Body() dto: UpsertCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Put(':id')
  @Permissions('collections', 'edit')
  update(@Param('id') id: string, @Body() dto: UpsertCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('collections', 'delete')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
