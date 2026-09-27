import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import type {
  InitializeTransactionInput,
  InitializeTransactionResult,
  PaymentProviderAdapter,
  ProviderTransactionStatus,
  RefundResult,
  VerifyTransactionResult,
  WebhookEvent,
} from '../payment-provider.interface';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

/** Paystack quotes amounts in kobo (1/100 of a Naira). */
const toKobo = (naira: number) => Math.round(naira * 100);
const fromKobo = (kobo: number) => kobo / 100;

@Injectable()
export class PaystackProvider implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.paystack;
  private readonly logger = new Logger(PaystackProvider.name);

  constructor(private readonly config: ConfigService) {}

  private get secretKey(): string {
    return this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY');
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<PaystackResponse<T>> {
    const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
    const body = (await response.json()) as PaystackResponse<T>;
    if (!response.ok || !body.status) {
      this.logger.error(`Paystack ${path} failed: ${body.message}`);
      throw new BadGatewayException(`Paystack request failed: ${body.message}`);
    }
    return body;
  }

  async initializeTransaction(
    input: InitializeTransactionInput,
  ): Promise<InitializeTransactionResult> {
    const result = await this.request<{
      authorization_url: string;
      reference: string;
    }>('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: input.customerEmail,
        amount: toKobo(input.amount),
        currency: input.currency,
        reference: `${input.orderId}-${Date.now()}`,
        callback_url: input.callbackUrl,
        metadata: { orderId: input.orderId },
      }),
    });
    return {
      authorizationUrl: result.data.authorization_url,
      reference: result.data.reference,
    };
  }

  async verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
    const result = await this.request<{
      status: string;
      amount: number;
      currency: string;
    }>(`/transaction/verify/${encodeURIComponent(reference)}`);
    return {
      reference,
      status: this.mapStatus(result.data.status),
      amount: fromKobo(result.data.amount),
      currency: result.data.currency,
      raw: result.data,
    };
  }

  async refund(transactionRef: string, amount?: number): Promise<RefundResult> {
    const result = await this.request<{ status: string; id: number }>(
      '/refund',
      {
        method: 'POST',
        body: JSON.stringify({
          transaction: transactionRef,
          ...(amount !== undefined ? { amount: toKobo(amount) } : {}),
        }),
      },
    );
    return {
      refundRef: String(result.data.id),
      status: result.data.status === 'processed' ? 'processed' : 'pending',
      raw: result.data,
    };
  }

  verifyWebhookSignature(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): boolean {
    if (!signatureHeader) return false;
    const expected = createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');
    const expectedBuf = Buffer.from(expected, 'utf8');
    const actualBuf = Buffer.from(signatureHeader, 'utf8');
    return (
      expectedBuf.length === actualBuf.length &&
      timingSafeEqual(expectedBuf, actualBuf)
    );
  }

  parseWebhookEvent(rawBody: Buffer): WebhookEvent | null {
    try {
      const parsed = JSON.parse(rawBody.toString('utf8')) as {
        event: string;
        data: { reference: string };
      };
      return {
        type: parsed.event,
        reference: parsed.data.reference,
        raw: parsed,
      };
    } catch {
      return null;
    }
  }

  private mapStatus(paystackStatus: string): ProviderTransactionStatus {
    if (paystackStatus === 'success') return 'success';
    if (paystackStatus === 'failed' || paystackStatus === 'abandoned')
      return 'failed';
    return 'pending';
  }
}
