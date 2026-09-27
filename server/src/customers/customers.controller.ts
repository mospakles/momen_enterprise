import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { AddCustomerNoteDto } from './dto/add-customer-note.dto';
import { AdminJwtAuthGuard } from '../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedAdminUser } from '../auth/admin-auth/admin-jwt.strategy';

@ApiTags('admin-customers')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Permissions('customers', 'view')
  findAll(@Query('search') search?: string) {
    return this.customersService.findAll(search);
  }

  @Get(':id')
  @Permissions('customers', 'view')
  findOne(@Param('id') id: string) {
    return this.customersService.findOneAggregated(id);
  }

  @Patch(':id')
  @Permissions('customers', 'edit')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Post(':id/notes')
  @Permissions('customers', 'edit')
  addNote(
    @Param('id') id: string,
    @Body() dto: AddCustomerNoteDto,
    @CurrentUser() user: AuthenticatedAdminUser,
  ) {
    return this.customersService.addNote(id, dto, user.id, user.name);
  }
}
