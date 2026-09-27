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
import { FabricsService } from './fabrics.service';
import { UpsertFabricDto } from './dto/upsert-fabric.dto';
import { Public } from '../../common/decorators/public.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('storefront-fabrics')
@Public()
@Controller('fabrics')
export class FabricsController {
  constructor(private readonly fabricsService: FabricsService) {}

  @Get()
  findAvailable() {
    return this.fabricsService.findAvailable();
  }
}

@ApiTags('admin-fabrics')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/fabrics')
export class AdminFabricsController {
  constructor(private readonly fabricsService: FabricsService) {}

  @Get()
  @Permissions('products', 'view')
  findAll() {
    return this.fabricsService.findAllAdmin();
  }

  @Post()
  @Permissions('products', 'create')
  create(@Body() dto: UpsertFabricDto) {
    return this.fabricsService.create(dto);
  }

  @Put(':id')
  @Permissions('products', 'edit')
  update(@Param('id') id: string, @Body() dto: UpsertFabricDto) {
    return this.fabricsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('products', 'delete')
  remove(@Param('id') id: string) {
    return this.fabricsService.remove(id);
  }
}
