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
import { ColorSwatchesService } from './color-swatches.service';
import { UpsertColorSwatchDto } from './dto/upsert-color-swatch.dto';
import { Public } from '../../common/decorators/public.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('storefront-colours')
@Public()
@Controller('color-swatches')
export class ColorSwatchesController {
  constructor(private readonly colorSwatchesService: ColorSwatchesService) {}

  @Get()
  findAll() {
    return this.colorSwatchesService.findAll();
  }
}

@ApiTags('admin-colours')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/color-swatches')
export class AdminColorSwatchesController {
  constructor(private readonly colorSwatchesService: ColorSwatchesService) {}

  @Post()
  @Permissions('products', 'create')
  create(@Body() dto: UpsertColorSwatchDto) {
    return this.colorSwatchesService.create(dto);
  }

  @Put(':id')
  @Permissions('products', 'edit')
  update(@Param('id') id: string, @Body() dto: UpsertColorSwatchDto) {
    return this.colorSwatchesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('products', 'delete')
  remove(@Param('id') id: string) {
    return this.colorSwatchesService.remove(id);
  }
}
