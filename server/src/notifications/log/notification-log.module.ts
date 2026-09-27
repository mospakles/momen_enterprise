import { Module } from '@nestjs/common';
import { AdminNotificationLogController } from './admin-notification-log.controller';
import { NotificationLogService } from './notification-log.service';

@Module({
  controllers: [AdminNotificationLogController],
  providers: [NotificationLogService],
  exports: [NotificationLogService],
})
export class NotificationLogModule {}
