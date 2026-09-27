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
import { DeliveryZonesService } from './delivery-zones.service';
import { UpsertDeliveryZoneDto } from './dto/upsert-delivery-zone.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('admin-delivery')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/delivery-zones')
export class AdminDeliveryZonesController {
  constructor(private readonly service: DeliveryZonesService) {}

  @Get()
  @Permissions('delivery', 'view')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Permissions('delivery', 'view')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('delivery', 'create')
  create(@Body() dto: UpsertDeliveryZoneDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Permissions('delivery', 'edit')
  update(@Param('id') id: string, @Body() dto: UpsertDeliveryZoneDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('delivery', 'delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
