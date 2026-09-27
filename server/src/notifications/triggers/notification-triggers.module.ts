import { Module } from '@nestjs/common';
import { AdminNotificationTriggersController } from './admin-notification-triggers.controller';
import { NotificationTriggersService } from './notification-triggers.service';

@Module({
  controllers: [AdminNotificationTriggersController],
  providers: [NotificationTriggersService],
  exports: [NotificationTriggersService],
})
export class NotificationTriggersModule {}
