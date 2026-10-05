import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { access } from 'fs/promises';
import { constants } from 'fs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailSenderService } from '../notifications/email-sender.service';
import { MEDIA_UPLOAD_DIR } from '../cms/media/media-storage.config';
import type { CreateContactMessageDto } from './dto/platform.dto';

export const PLATFORM_SETTINGS_KEY = 'platform';

export const DEFAULT_PLATFORM_SETTINGS = {
  general: {
    brandName: 'Momen',
    logoUrl: '',
    faviconUrl: '',
    supportEmail: 'hello@momen.style',
    supportPhone: '',
    instagram: '',
    tiktok: '',
    pinterest: '',
  },
  currency: { defaultCurrency: 'NGN', supportedCurrencies: ['NGN'] },
  tax: { taxInclusive: true, defaultRatePct: 0, regions: [] },
  checkout: {
    guestCheckoutEnabled: true,
    minimumOrderValue: 0,
  },
  notifications: {
    emailFromName: 'Momen',
    emailFromAddress: 'hello@momen.style',
    smsEnabled: false,
  },
  integrations: {
    analyticsProvider: '',
    emailProvider: 'Resend',
    shippingProvider: '',
    cloudStorageProvider: 'Local disk',
  },
};

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailSenderService,
    private readonly config: ConfigService,
  ) {}

  async getSettings() {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key: PLATFORM_SETTINGS_KEY },
    });
    return row?.value ?? DEFAULT_PLATFORM_SETTINGS;
  }

  async updateSettings(value: Record<string, unknown>) {
    const json = value as Prisma.InputJsonValue;
    const row = await this.prisma.platformSetting.upsert({
      where: { key: PLATFORM_SETTINGS_KEY },
      create: { key: PLATFORM_SETTINGS_KEY, value: json },
      update: { value: json },
    });
    return row.value;
  }

  async subscribe(rawEmail: string) {
    const email = rawEmail.trim().toLowerCase();
    const subscriber = await this.prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email },
      update: { unsubscribedAt: null },
    });
    await this.email.send(
      email,
      'Welcome to the Momen list',
      'You are subscribed to Momen news, new releases, and atelier stories.',
    );
    return { id: subscriber.id, email: subscriber.email };
  }

  async createContactMessage(dto: CreateContactMessageDto) {
    const message = await this.prisma.contactMessage.create({
      data: { ...dto, email: dto.email.toLowerCase() },
    });
    const supportEmail =
      this.config.get('SUPPORT_EMAIL') ?? 'hello@momen.style';
    await this.email.send(
      supportEmail,
      `[Contact] ${dto.topic}`,
      `${dto.name} <${dto.email}> wrote:\n\n${dto.message}`,
    );
    return { id: message.id, createdAt: message.createdAt };
  }

  listSubscribers() {
    return this.prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  listContactMessages() {
    return this.prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async health() {
    const started = Date.now();
    let database: 'operational' | 'down' = 'operational';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }
    let storage: 'operational' | 'down' = 'operational';
    try {
      await access(MEDIA_UPLOAD_DIR, constants.R_OK | constants.W_OK);
    } catch {
      storage = 'down';
    }
    return {
      status: database === 'operational' && storage === 'operational' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: [
        {
          id: 'api',
          name: 'API',
          status: 'operational',
          latencyMs: Date.now() - started,
          lastCheckedAt: new Date().toISOString(),
        },
        {
          id: 'database',
          name: 'Database',
          status: database,
          lastCheckedAt: new Date().toISOString(),
        },
        {
          id: 'storage',
          name: 'Upload storage',
          status: storage,
          lastCheckedAt: new Date().toISOString(),
        },
        {
          id: 'email',
          name: 'Email provider',
          status: this.config.get('RESEND_API_KEY') ? 'operational' : 'degraded',
          lastCheckedAt: new Date().toISOString(),
        },
        {
          id: 'payments',
          name: 'Paystack',
          status: this.config.get('PAYSTACK_SECRET_KEY') ? 'operational' : 'degraded',
          lastCheckedAt: new Date().toISOString(),
        },
      ],
    };
  }
}
