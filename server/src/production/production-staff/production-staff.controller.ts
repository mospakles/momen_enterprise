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
import { ProductionStaffService } from './production-staff.service';
import { UpsertProductionStaffDto } from './dto/upsert-production-staff.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('admin-production-staff')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/production-staff')
export class ProductionStaffController {
  constructor(private readonly service: ProductionStaffService) {}

  @Get()
  @Permissions('production', 'view')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Permissions('production', 'view')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('production', 'create')
  create(@Body() dto: UpsertProductionStaffDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Permissions('production', 'edit')
  update(@Param('id') id: string, @Body() dto: UpsertProductionStaffDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('production', 'delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
