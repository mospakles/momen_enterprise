import { Module } from '@nestjs/common';
import { HomepageController } from './homepage.controller';
import { AdminHomepageController } from './admin-homepage.controller';
import { HomepageService } from './homepage.service';

@Module({
  controllers: [HomepageController, AdminHomepageController],
  providers: [HomepageService],
  exports: [HomepageService],
})
export class HomepageModule {}
