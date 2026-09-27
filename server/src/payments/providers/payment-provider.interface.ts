import { PaymentProvider } from '@prisma/client';

// The one interface every concrete provider (Paystack today, Flutterwave/
// Stripe/bank-transfer later) implements. PaymentsService, RefundsService,
// and the webhook controller only ever talk to this — no provider-specific
// code anywhere outside `payments/providers/<provider>/`.

export interface InitializeTransactionInput {
  orderId: string;
  /** Major currency unit (Naira, not kobo) — each adapter converts internally. */
  amount: number;
  currency: string;
  customerEmail: string;
  /** Where the provider should redirect the customer after payment. */
  callbackUrl?: string;
}

export interface InitializeTransactionResult {
  /** URL the customer is redirected to (or the frontend opens) to pay. */
  authorizationUrl: string;
  /** The provider's own reference for this attempt — becomes PaymentTransaction.providerRef. */
  reference: string;
}

export type ProviderTransactionStatus = 'success' | 'failed' | 'pending';

export interface VerifyTransactionResult {
  reference: string;
  status: ProviderTransactionStatus;
  amount: number;
  currency: string;
  raw: unknown;
}

export type ProviderRefundStatus = 'pending' | 'processed' | 'failed';

export interface RefundResult {
  refundRef: string;
  status: ProviderRefundStatus;
  raw: unknown;
}

export interface WebhookEvent {
  type: string;
  reference: string;
  raw: unknown;
}

export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  initializeTransaction(
    input: InitializeTransactionInput,
  ): Promise<InitializeTransactionResult>;
  verifyTransaction(reference: string): Promise<VerifyTransactionResult>;
  /** `amount` omitted means a full refund. */
  refund(transactionRef: string, amount?: number): Promise<RefundResult>;
  /** Must use a timing-safe comparison — this is the only thing standing
   * between "a webhook Paystack sent" and "a POST anyone on the internet sent". */
  verifyWebhookSignature(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): boolean;
  parseWebhookEvent(rawBody: Buffer): WebhookEvent | null;
}
