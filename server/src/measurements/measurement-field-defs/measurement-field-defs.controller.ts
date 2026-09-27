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
import { MeasurementFieldDefsService } from './measurement-field-defs.service';
import { UpsertMeasurementFieldDefDto } from './dto/upsert-measurement-field-def.dto';
import { Public } from '../../common/decorators/public.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('storefront-measurement-fields')
@Public()
@Controller('measurement-fields')
export class MeasurementFieldDefsController {
  constructor(private readonly service: MeasurementFieldDefsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}

@ApiTags('admin-measurement-fields')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/measurement-fields')
export class AdminMeasurementFieldDefsController {
  constructor(private readonly service: MeasurementFieldDefsService) {}

  @Post()
  @Permissions('measurements', 'create')
  create(@Body() dto: UpsertMeasurementFieldDefDto) {
    return this.service.create(dto);
  }

  @Put(':key')
  @Permissions('measurements', 'edit')
  update(@Param('key') key: string, @Body() dto: UpsertMeasurementFieldDefDto) {
    return this.service.update(key, dto);
  }

  @Delete(':key')
  @Permissions('measurements', 'delete')
  remove(@Param('key') key: string) {
    return this.service.remove(key);
  }
}
