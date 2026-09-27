import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaymentProvider } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertProviderConfigDto } from './dto/upsert-provider-config.dto';

function mask(key: string | null): string | null {
  if (!key) return null;
  return key.length <= 4 ? '••••' : `••••${key.slice(-4)}`;
}

@Injectable()
export class PaymentProviderConfigService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize<
    T extends { publicKey: string | null; secretKey: string | null },
  >(config: T) {
    return {
      ...config,
      publicKeyMasked: mask(config.publicKey),
      secretKeyMasked: mask(config.secretKey),
      publicKey: undefined,
      secretKey: undefined,
    };
  }

  async findAll() {
    const configs = await this.prisma.paymentProviderConfig.findMany();
    return configs.map((c) => this.serialize(c));
  }

  async upsert(dto: UpsertProviderConfigDto) {
    const config = await this.prisma.paymentProviderConfig.upsert({
      where: { provider: dto.provider },
      create: {
        provider: dto.provider,
        enabled: dto.enabled,
        mode: dto.mode,
        currencies: dto.currencies,
        publicKey: dto.publicKey,
        secretKey: dto.secretKey,
        webhookUrl: dto.webhookUrl,
        webhookConfigured: Boolean(dto.webhookUrl),
      },
      update: {
        enabled: dto.enabled,
        mode: dto.mode,
        currencies: dto.currencies,
        ...(dto.publicKey !== undefined ? { publicKey: dto.publicKey } : {}),
        ...(dto.secretKey !== undefined ? { secretKey: dto.secretKey } : {}),
        ...(dto.webhookUrl !== undefined
          ? {
              webhookUrl: dto.webhookUrl,
              webhookConfigured: Boolean(dto.webhookUrl),
            }
          : {}),
      },
    });
    return this.serialize(config);
  }

  async remove(provider: PaymentProvider) {
    const exists = await this.prisma.paymentProviderConfig.findUnique({
      where: { provider },
    });
    if (!exists) throw new NotFoundException('Provider config not found');
    await this.prisma.paymentProviderConfig.delete({ where: { provider } });
  }
}
