import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminPlatformController, PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({
  imports: [NotificationsModule],
  controllers: [PlatformController, AdminPlatformController],
  providers: [PlatformService],
  exports: [PlatformService],
})
export class PlatformModule {}
