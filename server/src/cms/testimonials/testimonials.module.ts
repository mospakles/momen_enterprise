import { Module } from '@nestjs/common';
import { TestimonialsController } from './testimonials.controller';
import { AdminTestimonialsController } from './admin-testimonials.controller';
import { TestimonialsService } from './testimonials.service';

@Module({
  controllers: [TestimonialsController, AdminTestimonialsController],
  providers: [TestimonialsService],
  exports: [TestimonialsService],
})
export class TestimonialsModule {}
