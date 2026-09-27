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
import { CouponsService } from './coupons.service';
import { UpsertCouponDto } from './dto/upsert-coupon.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('admin-coupons')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @Permissions('promotions', 'view')
  findAll() {
    return this.couponsService.findAll();
  }

  @Get(':id')
  @Permissions('promotions', 'view')
  findOne(@Param('id') id: string) {
    return this.couponsService.findOne(id);
  }

  @Post()
  @Permissions('promotions', 'create')
  create(@Body() dto: UpsertCouponDto) {
    return this.couponsService.create(dto);
  }

  @Put(':id')
  @Permissions('promotions', 'edit')
  update(@Param('id') id: string, @Body() dto: UpsertCouponDto) {
    return this.couponsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('promotions', 'delete')
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }
}
