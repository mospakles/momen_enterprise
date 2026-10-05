import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  constructor(private readonly config: ConfigService) {}

  async send(
    to: string,
    subject: string,
    body: string,
  ): Promise<{ success: boolean }> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('EMAIL_FROM');
    if (!apiKey || !from) {
      if (this.config.get('NODE_ENV') === 'production') {
        this.logger.error(
          'Email delivery is not configured: RESEND_API_KEY and EMAIL_FROM are required',
        );
        return { success: false };
      }
      this.logger.log(`[dev email] to=${to} subject="${subject}"\n${body}`);
      return { success: true };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to: [to], subject, text: body }),
      });
      if (!response.ok) {
        this.logger.error(
          `Email provider rejected message (${response.status}): ${await response.text()}`,
        );
        return { success: false };
      }
      return { success: true };
    } catch (error) {
      this.logger.error('Email provider request failed', error);
      return { success: false };
    }
  }
}
