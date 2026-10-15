import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '@prisma/client';
import { timingSafeEqual } from 'crypto';
import type {
  InitializeTransactionInput,
  InitializeTransactionResult,
  PaymentProviderAdapter,
  ProviderTransactionStatus,
  RefundResult,
  VerifyTransactionResult,
  WebhookEvent,
} from '../payment-provider.interface';

const FLW_BASE_URL = 'https://api.flutterwave.com/v3';

interface FlwResponse<T> {
  status: string;
  message: string;
  data: T;
}

/** Flutterwave Standard: hosted checkout (card, bank transfer, USSD), with
 * verification by our own `tx_ref`. Amounts are in Naira (major units). */
@Injectable()
export class FlutterwaveProvider implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.flutterwave;
  private readonly logger = new Logger(FlutterwaveProvider.name);

  constructor(private readonly config: ConfigService) {}

  get configured() {
    return Boolean(this.config.get<string>('FLUTTERWAVE_SECRET_KEY'));
  }

  private get secretKey(): string {
    return this.config.getOrThrow<string>('FLUTTERWAVE_SECRET_KEY');
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<FlwResponse<T>> {
    const response = await fetch(`${FLW_BASE_URL}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json', ...init.headers },
    });
    const body = (await response.json()) as FlwResponse<T>;
    if (!response.ok || body.status !== 'success') {
      this.logger.error(`Flutterwave ${path} failed: ${body.message}`);
      throw new BadGatewayException(`Flutterwave request failed: ${body.message}`);
    }
    return body;
  }

  async initializeTransaction(input: InitializeTransactionInput): Promise<InitializeTransactionResult> {
    const reference = `${input.orderId}-${Date.now()}`;
    const result = await this.request<{ link: string }>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        tx_ref: reference,
        amount: input.amount,
        currency: input.currency,
        redirect_url: input.callbackUrl,
        customer: { email: input.customerEmail },
        payment_options: 'card,banktransfer,ussd',
        meta: { orderId: input.orderId },
        customizations: { title: 'momen.', description: `Order ${input.orderId}` },
      }),
    });
    return { authorizationUrl: result.data.link, reference };
  }

  async verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
    const result = await this.request<{ status: string; amount: number; currency: string; id: number }>(
      `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
    );
    return {
      reference,
      status: this.mapStatus(result.data.status),
      amount: result.data.amount,
      currency: result.data.currency,
      raw: result.data,
    };
  }

  /** Flutterwave refunds by its own transaction id, looked up from our ref. */
  async refund(transactionRef: string, amount?: number): Promise<RefundResult> {
    const verified = await this.request<{ id: number }>(
      `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(transactionRef)}`,
    );
    const result = await this.request<{ id: number; status: string }>(`/transactions/${verified.data.id}/refund`, {
      method: 'POST',
      body: JSON.stringify(amount !== undefined ? { amount } : {}),
    });
    return {
      refundRef: String(result.data.id),
      status: result.data.status === 'completed' ? 'processed' : 'pending',
      raw: result.data,
    };
  }

  /** Flutterwave sends the dashboard "secret hash" verbatim in `verif-hash`. */
  verifyWebhookSignature(_rawBody: Buffer, signatureHeader: string | undefined): boolean {
    const expected = this.config.get<string>('FLUTTERWAVE_WEBHOOK_HASH');
    if (!expected || !signatureHeader) return false;
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signatureHeader, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  parseWebhookEvent(rawBody: Buffer): WebhookEvent | null {
    try {
      const parsed = JSON.parse(rawBody.toString('utf8')) as { event?: string; data?: { tx_ref?: string } };
      if (!parsed.data?.tx_ref) return null;
      return { type: parsed.event ?? 'charge.completed', reference: parsed.data.tx_ref, raw: parsed };
    } catch {
      return null;
    }
  }

  private mapStatus(status: string): ProviderTransactionStatus {
    if (status === 'successful') return 'success';
    if (status === 'failed' || status === 'cancelled') return 'failed';
    return 'pending';
  }
}
