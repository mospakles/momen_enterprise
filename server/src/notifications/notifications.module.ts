import { Global, Module } from '@nestjs/common';
import { EmailTemplatesModule } from './templates/email-templates.module';
import { NotificationTriggersModule } from './triggers/notification-triggers.module';
import { NotificationLogModule } from './log/notification-log.module';
import { NotificationsService } from './notifications.service';
import { EmailSenderService } from './email-sender.service';
import { OrderNotificationsListener } from './order-notifications.listener';
import { AdminNotificationTestController } from './admin-notification-test.controller';

@Global()
@Module({
  imports: [
    EmailTemplatesModule,
    NotificationTriggersModule,
    NotificationLogModule,
  ],
  providers: [
    NotificationsService,
    EmailSenderService,
    OrderNotificationsListener,
  ],
  controllers: [AdminNotificationTestController],
  exports: [NotificationsService, EmailSenderService],
})
export class NotificationsModule {}
