import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MeasurementProfilesService } from './measurement-profiles.service';
import { UpsertMeasurementProfileDto } from './dto/upsert-measurement-profile.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedAdminUser } from '../../auth/admin-auth/admin-jwt.strategy';

/** CRM view — admins can see a customer's measurement history, and (with
 * the `measurements:edit` permission — e.g. Customer Support correcting a
 * typo on the customer's behalf) edit it. Every admin-made edit is
 * audit-logged; a customer's own edits through their own account are not
 * (see MeasurementProfilesService.update's `isAdminActor` flag). */
@ApiTags('admin-measurement-profiles')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/customers/:customerId/measurement-profiles')
export class AdminMeasurementProfilesController {
  constructor(private readonly service: MeasurementProfilesService) {}

  @Get()
  @Permissions('measurements', 'view')
  findForCustomer(@Param('customerId') customerId: string) {
    return this.service.findAllForCustomer(customerId);
  }

  @Put(':id')
  @Permissions('measurements', 'edit')
  update(
    @Param('customerId') customerId: string,
    @Param('id') id: string,
    @Body() dto: UpsertMeasurementProfileDto,
    @CurrentUser() user: AuthenticatedAdminUser,
  ) {
    return this.service.update(
      id,
      customerId,
      dto,
      { id: user.id, name: user.name },
      true,
    );
  }
}
