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
import { ProductionTimelineRulesService } from './production-timeline-rules.service';
import { UpsertTimelineRuleDto } from './dto/upsert-timeline-rule.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('admin-production-timeline-rules')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/production-timeline-rules')
export class ProductionTimelineRulesController {
  constructor(private readonly service: ProductionTimelineRulesService) {}

  @Get()
  @Permissions('production', 'view')
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Permissions('production', 'create')
  create(@Body() dto: UpsertTimelineRuleDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Permissions('production', 'edit')
  update(@Param('id') id: string, @Body() dto: UpsertTimelineRuleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('production', 'delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
