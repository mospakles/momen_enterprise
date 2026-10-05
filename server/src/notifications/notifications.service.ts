import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationEvent,
  NotificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailTemplatesService } from './templates/email-templates.service';
import { NotificationLogService } from './log/notification-log.service';
import { EmailSenderService } from './email-sender.service';
import { renderTemplate } from './render-template.util';

/**
 * The single fan-out point every domain event goes through — order status
 * changes, refunds, account creation, etc. all end up calling `dispatch`
 * rather than sending email directly, so "is this event configured to
 * notify anyone, on which channels, with which template" is answered in one
 * place instead of re-implemented per caller.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailTemplatesService: EmailTemplatesService,
    private readonly emailSender: EmailSenderService,
    private readonly notificationLog: NotificationLogService,
  ) {}

  async dispatch(
    event: NotificationEvent,
    recipient: string,
    variables: Record<string, string>,
  ): Promise<void> {
    const trigger = await this.prisma.notificationTrigger.findUnique({
      where: { event },
    });
    if (!trigger || !trigger.enabled) return;

    for (const channel of trigger.channels) {
      if (channel === NotificationChannel.email) {
        await this.sendEmail(
          trigger.id,
          trigger.emailTemplateId,
          recipient,
          variables,
        );
      } else {
        // In-app/SMS delivery isn't implemented yet — logged as queued so
        // the trigger's configuration is still visible/auditable in the
        // notification log rather than silently doing nothing.
        await this.notificationLog.log({
          triggerId: trigger.id,
          channel,
          recipient,
          subject: trigger.label,
          status: NotificationStatus.queued,
        });
      }
    }
  }

  async sendTest(triggerId: string, recipient: string) {
    const trigger = await this.prisma.notificationTrigger.findUniqueOrThrow({
      where: { id: triggerId },
    });
    await this.sendEmail(
      trigger.id,
      trigger.emailTemplateId,
      recipient,
      {},
    );
    return { ok: true };
  }

  async sendTemplateTest(templateId: string, recipient: string) {
    const template = await this.emailTemplatesService.findOne(templateId);
    const subject = renderTemplate(template.subject, {});
    const body = renderTemplate(template.body, {});
    const result = await this.emailSender.send(recipient, subject, body);
    await this.notificationLog.log({
      channel: NotificationChannel.email,
      recipient,
      subject,
      status: result.success ? NotificationStatus.sent : NotificationStatus.failed,
    });
    return { ok: result.success };
  }

  private async sendEmail(
    triggerId: string,
    emailTemplateId: string | null,
    recipient: string,
    variables: Record<string, string>,
  ) {
    if (!emailTemplateId) {
      this.logger.warn(
        `Trigger ${triggerId} has email in its channels but no emailTemplateId configured`,
      );
      return;
    }

    const template = await this.emailTemplatesService
      .findOne(emailTemplateId)
      .catch(() => null);
    if (!template) {
      await this.notificationLog.log({
        triggerId,
        channel: NotificationChannel.email,
        recipient,
        subject: '(missing template)',
        status: NotificationStatus.failed,
      });
      return;
    }

    const subject = renderTemplate(template.subject, variables);
    const body = renderTemplate(template.body, variables);
    const result = await this.emailSender.send(recipient, subject, body);

    await this.notificationLog.log({
      triggerId,
      channel: NotificationChannel.email,
      recipient,
      subject,
      status: result.success
        ? NotificationStatus.sent
        : NotificationStatus.failed,
    });
  }
}
