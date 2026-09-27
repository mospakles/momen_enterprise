import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReviewStatus } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { RespondReviewDto } from './dto/respond-review.dto';
import { AdminJwtAuthGuard } from '../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@ApiTags('admin-reviews')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @Permissions('reviews', 'view')
  findAll(@Query('status') status?: ReviewStatus) {
    return this.reviewsService.findAllAdmin(status);
  }

  @Patch(':id/status')
  @Permissions('reviews', 'approve')
  setStatus(@Param('id') id: string, @Body('status') status: ReviewStatus) {
    return this.reviewsService.setStatus(id, status);
  }

  @Patch(':id/featured')
  @Permissions('reviews', 'edit')
  toggleFeatured(@Param('id') id: string) {
    return this.reviewsService.toggleFeatured(id);
  }

  @Post(':id/respond')
  @Permissions('reviews', 'edit')
  respond(@Param('id') id: string, @Body() dto: RespondReviewDto) {
    return this.reviewsService.respond(id, dto.message);
  }

  @Delete(':id')
  @Permissions('reviews', 'delete')
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}
