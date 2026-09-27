import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GiftCardStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { generateGiftCardCode } from './gift-card-code.util';
import type { IssueGiftCardDto } from './dto/issue-gift-card.dto';

@Injectable()
export class GiftCardsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.giftCard.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const card = await this.prisma.giftCard.findUnique({
      where: { id },
      include: { history: { orderBy: { createdAt: 'desc' } } },
    });
    if (!card) throw new NotFoundException('Gift card not found');
    return card;
  }

  async issue(dto: IssueGiftCardDto) {
    const code = await generateGiftCardCode(this.prisma);
    return this.prisma.giftCard.create({
      data: {
        code,
        initialValue: dto.initialValue,
        balance: dto.initialValue,
        issuedTo: dto.issuedTo,
        purchasedBy: dto.purchasedBy,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        history: { create: [{ amount: dto.initialValue, note: 'Issued' }] },
      },
    });
  }

  async updateStatus(id: string, status: GiftCardStatus) {
    const card = await this.prisma.giftCard.findUnique({ where: { id } });
    if (!card) throw new NotFoundException('Gift card not found');
    return this.prisma.giftCard.update({ where: { id }, data: { status } });
  }

  /** Public balance check — no purchaser/recipient PII in the response,
   * since anyone holding the code (e.g. a gift recipient) should be able to
   * check it. */
  async checkBalance(code: string) {
    const card = await this.prisma.giftCard.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!card) throw new NotFoundException('Gift card not found');
    return {
      code: card.code,
      balance: Number(card.balance),
      status: this.effectiveStatus(card),
      expiresAt: card.expiresAt,
    };
  }

  private effectiveStatus(card: {
    status: GiftCardStatus;
    balance: Prisma.Decimal;
    expiresAt: Date | null;
  }): GiftCardStatus {
    if (card.status === GiftCardStatus.disabled) return GiftCardStatus.disabled;
    if (card.expiresAt && card.expiresAt < new Date())
      return GiftCardStatus.expired;
    if (Number(card.balance) <= 0) return GiftCardStatus.redeemed;
    return GiftCardStatus.active;
  }

  /** Validates a gift card by code and returns how much of `requestedAmount`
   * it can actually cover — capped at its balance, never more. Doesn't
   * touch the balance; see `redeem` for the atomic deduction. */
  async validate(
    code: string,
    requestedAmount: number,
  ): Promise<{ giftCardId: string; code: string; amountToApply: number }> {
    const card = await this.prisma.giftCard.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!card) throw new BadRequestException('Invalid gift card code');
    if (this.effectiveStatus(card) !== GiftCardStatus.active)
      throw new BadRequestException('This gift card is not usable');

    const amountToApply = Math.min(requestedAmount, Number(card.balance));
    if (amountToApply <= 0)
      throw new BadRequestException('This gift card has no remaining balance');

    return { giftCardId: card.id, code: card.code, amountToApply };
  }

  /** Called from within OrdersService.create's transaction — the ledger
   * (GiftCardTransaction) is the source of truth, `balance` is just kept in
   * step with it in the same write. */
  async redeem(
    tx: Prisma.TransactionClient,
    giftCardId: string,
    orderId: string,
    amount: number,
  ) {
    const card = await tx.giftCard.findUniqueOrThrow({
      where: { id: giftCardId },
    });
    if (Number(card.balance) < amount)
      throw new BadRequestException(
        'Gift card balance changed — please try again',
      );

    const newBalance = Number(card.balance) - amount;
    await tx.giftCard.update({
      where: { id: giftCardId },
      data: {
        balance: newBalance,
        status: newBalance <= 0 ? GiftCardStatus.redeemed : card.status,
      },
    });
    await tx.giftCardTransaction.create({
      data: {
        giftCardId,
        orderId,
        amount: -amount,
        note: `Redeemed on order ${orderId}`,
      },
    });
  }
}
