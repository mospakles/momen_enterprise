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
import { CustomizationService } from './customization.service';
import { UpsertCustomizationGroupDto } from './dto/upsert-customization-group.dto';
import { Public } from '../../common/decorators/public.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('storefront-customization')
@Public()
@Controller('customization-groups')
export class CustomizationController {
  constructor(private readonly customizationService: CustomizationService) {}

  @Get()
  findAll() {
    return this.customizationService.findAll();
  }
}

@ApiTags('admin-customization')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/customization-groups')
export class AdminCustomizationController {
  constructor(private readonly customizationService: CustomizationService) {}

  @Post()
  @Permissions('products', 'create')
  create(@Body() dto: UpsertCustomizationGroupDto) {
    return this.customizationService.create(dto);
  }

  @Put(':id')
  @Permissions('products', 'edit')
  update(@Param('id') id: string, @Body() dto: UpsertCustomizationGroupDto) {
    return this.customizationService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('products', 'delete')
  remove(@Param('id') id: string) {
    return this.customizationService.remove(id);
  }
}
