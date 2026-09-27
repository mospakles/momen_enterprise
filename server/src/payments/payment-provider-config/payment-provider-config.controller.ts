import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import { PaymentProviderConfigService } from './payment-provider-config.service';
import { UpsertProviderConfigDto } from './dto/upsert-provider-config.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('admin-payment-providers')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/payment-providers')
export class PaymentProviderConfigController {
  constructor(private readonly service: PaymentProviderConfigService) {}

  @Get()
  @Permissions('payments', 'view')
  findAll() {
    return this.service.findAll();
  }

  @Put()
  @Permissions('payments', 'edit')
  upsert(@Body() dto: UpsertProviderConfigDto) {
    return this.service.upsert(dto);
  }

  @Delete(':provider')
  @Permissions('payments', 'delete')
  remove(@Param('provider') provider: PaymentProvider) {
    return this.service.remove(provider);
  }
}
