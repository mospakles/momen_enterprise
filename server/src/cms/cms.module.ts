import { Module } from '@nestjs/common';
import { PagesModule } from './pages/pages.module';
import { BannersModule } from './banners/banners.module';
import { TestimonialsModule } from './testimonials/testimonials.module';
import { FaqsModule } from './faqs/faqs.module';
import { BlogModule } from './blog/blog.module';
import { NavigationModule } from './navigation/navigation.module';
import { HomepageModule } from './homepage/homepage.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    PagesModule,
    BannersModule,
    TestimonialsModule,
    FaqsModule,
    BlogModule,
    NavigationModule,
    HomepageModule,
    MediaModule,
  ],
  exports: [
    PagesModule,
    BannersModule,
    TestimonialsModule,
    FaqsModule,
    BlogModule,
    NavigationModule,
    HomepageModule,
    MediaModule,
  ],
})
export class CmsModule {}
