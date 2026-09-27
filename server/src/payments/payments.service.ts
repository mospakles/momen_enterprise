import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentProvider, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders/orders.service';
import { PaystackProvider } from './providers/paystack/paystack.provider';
import type { PaymentProviderAdapter } from './providers/payment-provider.interface';

@Injectable()
export class PaymentsService {
  private readonly adapters: Map<PaymentProvider, PaymentProviderAdapter>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    paystackProvider: PaystackProvider,
  ) {
    // Only Paystack is implemented — everything upstream of this map (the
    // service methods below, RefundsService, the webhook controller) talks
    // to `PaymentProviderAdapter` only, so adding Flutterwave/Stripe later
    // is "write the adapter, add it to this map," not a business-logic change.
    this.adapters = new Map<PaymentProvider, PaymentProviderAdapter>([
      [PaymentProvider.paystack, paystackProvider],
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
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertOwnsOrder(order, requester);
    if (order.paymentStatus === 'paid')
      throw new BadRequestException('Order is already paid');

    const adapter = await this.getActiveAdapter();
    const result = await adapter.initializeTransaction({
      orderId,
      amount: Number(order.total),
      currency: 'NGN',
      customerEmail: order.customerEmail,
    });

    await this.prisma.paymentTransaction.create({
      data: {
        orderId,
        provider: adapter.provider,
        providerRef: result.reference,
        amount: order.total,
        currency: 'NGN',
        status: 'pending',
      },
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
    return this.syncTransactionStatus(
      transaction.id,
      verified.status,
      verified.raw,
    );
  }

  private async syncTransactionStatus(
    transactionId: string,
    status: 'success' | 'failed' | 'pending',
    rawPayload: unknown,
  ) {
    const transaction = await this.prisma.paymentTransaction.findUniqueOrThrow({
      where: { id: transactionId },
    });
    const mappedStatus =
      status === 'success'
        ? 'paid'
        : status === 'failed'
          ? 'failed'
          : 'pending';

    await this.prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        status: mappedStatus,
        rawPayload: rawPayload as Prisma.InputJsonValue,
      },
    });

    if (mappedStatus === 'paid' || mappedStatus === 'failed') {
      await this.prisma.order.update({
        where: { id: transaction.orderId },
        data: {
          paymentProvider: transaction.provider,
          transactionId: transaction.providerRef,
        },
      });
      await this.ordersService.setPaymentStatus(
        transaction.orderId,
        mappedStatus,
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
    await this.syncTransactionStatus(
      transaction.id,
      verified.status,
      event.raw,
    );
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
}
