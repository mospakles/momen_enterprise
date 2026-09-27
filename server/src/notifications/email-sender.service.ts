import { Injectable, Logger } from '@nestjs/common';

/**
 * The one thing to swap for a real provider (SES, SendGrid, Postmark, ...).
 * Nothing else in the Notifications module — NotificationsService, the
 * order/refund/account event listeners — knows or cares how an email
 * actually gets sent, only that `send()` resolves. Dev/test behavior is to
 * log instead of actually delivering anything.
 */
@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);

  async send(
    to: string,
    subject: string,
    body: string,
  ): Promise<{ success: boolean }> {
    this.logger.log(`[dev email] to=${to} subject="${subject}"\n${body}`);
    return { success: true };
  }
}
