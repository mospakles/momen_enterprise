import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { Public } from '../common/decorators/public.decorator';
import { OptionalCustomerJwtAuthGuard } from '../common/guards/customer-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedCustomer } from '../auth/customer-auth/customer-jwt.strategy';

@ApiTags('storefront-reviews')
@Public()
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  findForProduct(@Query('productId') productId: string) {
    return this.reviewsService.findApprovedForProduct(productId);
  }

  @Post()
  @UseGuards(OptionalCustomerJwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(
    @CurrentUser() user: AuthenticatedCustomer | null,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(dto, user?.id);
  }
}
