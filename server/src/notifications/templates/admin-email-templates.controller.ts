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
import { EmailTemplatesService } from './email-templates.service';
import { UpsertEmailTemplateDto } from './dto/upsert-email-template.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('admin-email-templates')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/email-templates')
export class AdminEmailTemplatesController {
  constructor(private readonly service: EmailTemplatesService) {}

  @Get()
  @Permissions('notifications', 'view')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Permissions('notifications', 'view')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('notifications', 'create')
  create(@Body() dto: UpsertEmailTemplateDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Permissions('notifications', 'edit')
  update(@Param('id') id: string, @Body() dto: UpsertEmailTemplateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('notifications', 'delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
