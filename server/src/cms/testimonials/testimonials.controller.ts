import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TestimonialsService } from './testimonials.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('storefront-testimonials')
@Public()
@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly service: TestimonialsService) {}

  @Get()
  findFeatured() {
    return this.service.findFeatured();
  }
}
