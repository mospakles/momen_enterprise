import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  NoteAudience,
  OrderStatus,
  PaymentProvider,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders/orders.service';
import { PaystackProvider } from './providers/paystack/paystack.provider';
import { FlutterwaveProvider } from './providers/flutterwave/flutterwave.provider';
import type {
  PaymentProviderAdapter,
  VerifyTransactionResult,
} from './providers/payment-provider.interface';
import { ConfigService } from '@nestjs/config';

/** A pending provider checkout link is reused (browser retry after a network
 * timeout) only while it's this fresh — Paystack/Flutterwave links go stale. */
const REUSE_PENDING_CHECKOUT_MS = 30 * 60 * 1000;

const toMinor = (amount: number | Prisma.Decimal) =>
  Math.round(Number(amount) * 100);

function asJsonObject(value: unknown): Prisma.JsonObject | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Prisma.JsonObject)
    : undefined;
}

/** Keeps what we stored at initialization (notably `authorizationUrl`)
 * when the provider's verify/webhook payload is written over it. */
function mergeRawPayload(
  existing: Prisma.JsonValue | null,
  incoming: unknown,
  extra: Prisma.JsonObject = {},
): Prisma.InputJsonValue {
  const saved = asJsonObject(existing) ?? {};
  const fresh = asJsonObject(incoming) ?? (incoming === undefined ? {} : { provider: incoming as Prisma.JsonValue });
  return {
    ...saved,
    ...fresh,
    ...(typeof saved.authorizationUrl === 'string'
      ? { authorizationUrl: saved.authorizationUrl }
      : {}),
    ...extra,
  } as Prisma.InputJsonValue;
}

@Injectable()
export class PaymentsService {
  private readonly adapters: Map<PaymentProvider, PaymentProviderAdapter>;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly config: ConfigService,
    paystackProvider: PaystackProvider,
    private readonly flutterwaveProvider: FlutterwaveProvider,
  ) {
    // Only Paystack is implemented — everything upstream of this map (the
    // service methods below, RefundsService, the webhook controller) talks
    // to `PaymentProviderAdapter` only, so adding Flutterwave/Stripe later
    // is "write the adapter, add it to this map," not a business-logic change.
    this.adapters = new Map<PaymentProvider, PaymentProviderAdapter>([
      [PaymentProvider.paystack, paystackProvider],
      [PaymentProvider.flutterwave, flutterwaveProvider],
    ]);
  }

  async getActiveAdapter(): Promise<PaymentProviderAdapter> {
    const config = await this.prisma.paymentProviderConfig.findFirst({
      where: { enabled: true },
    });
    const provider = config?.provider ?? PaymentProvider.paystack; // sane default before any config row exists
    const adapter = this.adapters.get(provider);
    if (!adapter)
      throw new BadRequestException(
        `No adapter implemented for provider "${provider}"`,
      );
    return adapter;
  }

  /** Providers the storefront can offer: credentials present in the
   * environment and not switched off in admin payment settings. */
  async availableProviders(): Promise<PaymentProvider[]> {
    const configs = await this.prisma.paymentProviderConfig.findMany();
    const disabled = new Set(configs.filter((c) => !c.enabled).map((c) => c.provider));
    const out: PaymentProvider[] = [];
    if (this.config.get<string>('PAYSTACK_SECRET_KEY') && !disabled.has(PaymentProvider.paystack))
      out.push(PaymentProvider.paystack);
    if (this.flutterwaveProvider.configured && !disabled.has(PaymentProvider.flutterwave))
      out.push(PaymentProvider.flutterwave);
    return out;
  }

  getAdapter(provider: PaymentProvider): PaymentProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter)
      throw new BadRequestException(
        `No adapter implemented for provider "${provider}"`,
      );
    return adapter;
  }

  async initializePayment(
    orderId: string,
    requester: { customerId?: string; customerEmail?: string },
    provider?: PaymentProvider,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertOwnsOrder(order, requester);
    if (order.paymentStatus === 'paid')
      throw new BadRequestException('Order is already paid');
    if (order.status === OrderStatus.cancelled)
      throw new BadRequestException('This order has been cancelled');
    if (
      order.status === OrderStatus.refunded ||
      order.status === OrderStatus.partially_refunded ||
      order.paymentStatus === 'refunded' ||
      order.paymentStatus === 'partially_refunded'
    )
      throw new BadRequestException('This order has been refunded');

    let adapter: PaymentProviderAdapter;
    if (provider) {
      if (!(await this.availableProviders()).includes(provider))
        throw new BadRequestException(`${provider} is not available right now`);
      adapter = this.getAdapter(provider);
    } else {
      adapter = await this.getActiveAdapter();
    }
    // Reuse an active checkout URL when the browser retries after a network
    // timeout — but only while the link is fresh and was opened for the
    // order's current total. Anything older/different is superseded below.
    const pending = await this.prisma.paymentTransaction.findFirst({
      where: { orderId, provider: adapter.provider, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    const savedUrl = asJsonObject(pending?.rawPayload)?.authorizationUrl;
    if (
      pending &&
      typeof savedUrl === 'string' &&
      Date.now() - pending.createdAt.getTime() < REUSE_PENDING_CHECKOUT_MS &&
      toMinor(pending.amount) === toMinor(order.total) &&
      pending.currency === 'NGN'
    ) {
      return { authorizationUrl: savedUrl, reference: pending.providerRef };
    }
    const result = await adapter.initializeTransaction({
      orderId,
      amount: Number(order.total),
      currency: 'NGN',
      customerEmail: order.customerEmail,
      callbackUrl:
        this.config.get<string>('PAYSTACK_CALLBACK_URL') ??
        `${this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'}/checkout/payment-callback`,
    });

    await this.prisma.paymentTransaction.create({
      data: {
        orderId,
        provider: adapter.provider,
        providerRef: result.reference,
        amount: order.total,
        currency: 'NGN',
        status: 'pending',
        rawPayload: { authorizationUrl: result.authorizationUrl },
      },
    });

    // Older pending attempts for this order are superseded by the one just
    // created. PaymentStatus has no "abandoned" value, so they're recorded
    // as failed — on our side only. If the customer still completes one of
    // them, the provider webhook/verify re-syncs it to paid from the
    // provider's own status.
    await this.prisma.paymentTransaction.updateMany({
      where: {
        orderId,
        status: 'pending',
        NOT: { provider: adapter.provider, providerRef: result.reference },
      },
      data: { status: 'failed' },
    });

    return result;
  }

  /** Called from the frontend's payment callback page (reference arrives as
   * a query param from the provider's redirect) as well as being reusable
   * from the webhook path — both end up re-verifying with the provider
   * directly rather than trusting whatever status a URL param claims. */
  async verifyAndSync(reference: string) {
    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: { providerRef: reference },
    });
    if (!transaction)
      throw new NotFoundException('Payment reference not found');

    const adapter = this.getAdapter(transaction.provider);
    const verified = await adapter.verifyTransaction(reference);
    return this.syncTransactionStatus(transaction.id, verified, verified.raw);
  }

  private async syncTransactionStatus(
    transactionId: string,
    verified: VerifyTransactionResult,
    rawPayload: unknown,
  ) {
    const transaction = await this.prisma.paymentTransaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: { order: { select: { total: true, paymentStatus: true } } },
    });
    let mappedStatus: 'paid' | 'failed' | 'pending' =
      verified.status === 'success'
        ? 'paid'
        : verified.status === 'failed'
          ? 'failed'
          : 'pending';

    // The provider says "success", but for how much? A tampered or partial
    // charge must not settle the order. An underpayment (or a different
    // currency) is held as pending — not failed, because money did move and
    // failing would release the stock and invite a second payment — and
    // flagged for manual reconciliation via an internal order note.
    const expectedMinor = Math.max(
      toMinor(transaction.amount),
      toMinor(transaction.order.total),
    );
    const amountMismatch =
      mappedStatus === 'paid' &&
      (verified.currency?.toUpperCase() !== 'NGN' ||
        transaction.currency.toUpperCase() !== 'NGN' ||
        !Number.isFinite(verified.amount) ||
        toMinor(verified.amount) < expectedMinor);
    const alreadyFlagged =
      asJsonObject(transaction.rawPayload)?.amountMismatch === true;
    if (amountMismatch) {
      mappedStatus = 'pending';
      this.logger.error(
        `Payment ${transaction.providerRef} for order ${transaction.orderId} verified as successful for ${verified.amount} ${verified.currency}, expected ${expectedMinor / 100} NGN — not marking the order paid`,
      );
    }

    await this.prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        status: mappedStatus,
        rawPayload: mergeRawPayload(
          transaction.rawPayload,
          rawPayload,
          amountMismatch
            ? {
                amountMismatch: true,
                verifiedAmount: verified.amount,
                verifiedCurrency: verified.currency ?? null,
              }
            : {},
        ),
      },
    });

    if (amountMismatch && !alreadyFlagged) {
      await this.prisma.orderNote.create({
        data: {
          orderId: transaction.orderId,
          audience: NoteAudience.internal,
          authorName: 'System',
          message: `Payment ${transaction.providerRef} (${transaction.provider}) was reported successful for ${verified.amount} ${verified.currency ?? '?'} but the order expects ${expectedMinor / 100} NGN. The order was NOT marked paid — reconcile manually.`,
        },
      });
    }

    // A failure on an older, superseded attempt (or any failure after the
    // order is already paid) must not fail the order.
    let applyToOrder = mappedStatus === 'paid' || mappedStatus === 'failed';
    if (mappedStatus === 'failed') {
      const latest = await this.prisma.paymentTransaction.findFirst({
        where: { orderId: transaction.orderId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (
        transaction.order.paymentStatus === 'paid' ||
        latest?.id !== transaction.id
      )
        applyToOrder = false;
    }

    if (applyToOrder) {
      await this.prisma.order.update({
        where: { id: transaction.orderId },
        data: {
          paymentProvider: transaction.provider,
          transactionId: transaction.providerRef,
        },
      });
      await this.ordersService.setPaymentStatus(
        transaction.orderId,
        mappedStatus as 'paid' | 'failed',
      );
    }

    return { orderId: transaction.orderId, status: mappedStatus };
  }

  async handleWebhook(
    provider: PaymentProvider,
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ) {
    const adapter = this.getAdapter(provider);
    if (!adapter.verifyWebhookSignature(rawBody, signatureHeader)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const event = adapter.parseWebhookEvent(rawBody);
    if (!event) return { handled: false };

    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: { provider, providerRef: event.reference },
    });
    if (!transaction) return { handled: false }; // unknown reference — not ours, ignore rather than error

    // Never trust the webhook payload's own status field — re-verify
    // directly with the provider before mutating anything.
    const verified = await adapter.verifyTransaction(event.reference);
    await this.syncTransactionStatus(transaction.id, verified, event.raw);
    return { handled: true };
  }

  private assertOwnsOrder(
    order: { customerId: string | null; customerEmail: string },
    requester: { customerId?: string; customerEmail?: string },
  ) {
    if (order.customerId) {
      if (order.customerId !== requester.customerId)
        throw new ForbiddenException('Not your order');
      return;
    }
    if (
      !requester.customerEmail ||
      requester.customerEmail.toLowerCase() !==
        order.customerEmail.toLowerCase()
    ) {
      throw new ForbiddenException('Not your order');
    }
  }

  async findTransactions() {
    const rows = await this.prisma.paymentTransaction.findMany({
      include: {
        order: {
          select: {
            customerEmail: true,
            addressSnapshot: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({
      id: row.id,
      orderId: row.orderId,
      provider: row.provider,
      providerRef: row.providerRef,
      amount: Number(row.amount),
      currency: row.currency,
      status: row.status,
      customerEmail: row.order.customerEmail,
      customerName:
        (row.order.addressSnapshot as { fullName?: string } | null)?.fullName ??
        row.order.customerEmail,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }
}
