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
import { CollectionsService } from './collections.service';
import { UpsertCollectionDto } from './dto/upsert-collection.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('admin-collections')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/collections')
export class AdminCollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  @Permissions('collections', 'view')
  findAll() {
    return this.collectionsService.findAllAdmin();
  }

  @Get(':id')
  @Permissions('collections', 'view')
  findOne(@Param('id') id: string) {
    return this.collectionsService.findOne(id);
  }

  @Post()
  @Permissions('collections', 'create')
  create(@Body() dto: UpsertCollectionDto) {
    return this.collectionsService.create(dto);
  }

  @Put(':id')
  @Permissions('collections', 'edit')
  update(@Param('id') id: string, @Body() dto: UpsertCollectionDto) {
    return this.collectionsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('collections', 'delete')
  remove(@Param('id') id: string) {
    return this.collectionsService.remove(id);
  }
}
