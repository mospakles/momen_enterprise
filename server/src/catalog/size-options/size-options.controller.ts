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
import { SizeOptionsService } from './size-options.service';
import { UpsertSizeOptionDto } from './dto/upsert-size-option.dto';
import { Public } from '../../common/decorators/public.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('storefront-sizes')
@Public()
@Controller('size-options')
export class SizeOptionsController {
  constructor(private readonly sizeOptionsService: SizeOptionsService) {}

  @Get()
  findActive() {
    return this.sizeOptionsService.findActive();
  }
}

@ApiTags('admin-sizes')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/size-options')
export class AdminSizeOptionsController {
  constructor(private readonly sizeOptionsService: SizeOptionsService) {}

  @Get()
  @Permissions('products', 'view')
  findAll() {
    return this.sizeOptionsService.findAllAdmin();
  }

  @Post()
  @Permissions('products', 'create')
  create(@Body() dto: UpsertSizeOptionDto) {
    return this.sizeOptionsService.create(dto);
  }

  @Put(':id')
  @Permissions('products', 'edit')
  update(@Param('id') id: string, @Body() dto: UpsertSizeOptionDto) {
    return this.sizeOptionsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('products', 'delete')
  remove(@Param('id') id: string) {
    return this.sizeOptionsService.remove(id);
  }
}
