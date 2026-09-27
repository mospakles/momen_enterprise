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
import { MeasurementProfilesService } from './measurement-profiles.service';
import { UpsertMeasurementProfileDto } from './dto/upsert-measurement-profile.dto';
import { CustomerJwtAuthGuard } from '../../common/guards/customer-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedCustomer } from '../../auth/customer-auth/customer-jwt.strategy';

@ApiTags('measurement-profiles')
@ApiBearerAuth()
@UseGuards(CustomerJwtAuthGuard)
@Controller('measurement-profiles')
export class MeasurementProfilesController {
  constructor(private readonly service: MeasurementProfilesService) {}

  @Get()
  findMine(@CurrentUser() user: AuthenticatedCustomer) {
    return this.service.findAllForCustomer(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedCustomer,
    @Body() dto: UpsertMeasurementProfileDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedCustomer,
    @Param('id') id: string,
    @Body() dto: UpsertMeasurementProfileDto,
  ) {
    return this.service.update(id, user.id, dto, {
      id: user.id,
      name: user.name,
    });
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedCustomer, @Param('id') id: string) {
    return this.service.remove(id, user.id);
  }
}
