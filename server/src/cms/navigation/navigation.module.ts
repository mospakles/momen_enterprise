import { Module } from '@nestjs/common';
import { NavigationController } from './navigation.controller';
import { AdminNavigationController } from './admin-navigation.controller';
import { NavigationService } from './navigation.service';

@Module({
  controllers: [NavigationController, AdminNavigationController],
  providers: [NavigationService],
  exports: [NavigationService],
})
export class NavigationModule {}
