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
import { TestimonialsService } from './testimonials.service';
import { UpsertTestimonialDto } from './dto/upsert-testimonial.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('admin-testimonials')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/testimonials')
export class AdminTestimonialsController {
  constructor(private readonly service: TestimonialsService) {}

  @Get()
  @Permissions('content', 'view')
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Permissions('content', 'create')
  create(@Body() dto: UpsertTestimonialDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Permissions('content', 'edit')
  update(@Param('id') id: string, @Body() dto: UpsertTestimonialDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('content', 'delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
