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
import { FaqsService } from './faqs.service';
import { UpsertFaqDto } from './dto/upsert-faq.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('admin-faqs')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/faqs')
export class AdminFaqsController {
  constructor(private readonly service: FaqsService) {}

  @Get()
  @Permissions('content', 'view')
  findAll() {
    return this.service.findAllAdmin();
  }

  @Post()
  @Permissions('content', 'create')
  create(@Body() dto: UpsertFaqDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Permissions('content', 'edit')
  update(@Param('id') id: string, @Body() dto: UpsertFaqDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('content', 'delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
