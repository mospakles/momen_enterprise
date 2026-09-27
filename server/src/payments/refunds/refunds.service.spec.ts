import { BadRequestException } from '@nestjs/common';
import { RefundStatus, RefundType } from '@prisma/client';
import { RefundsService } from './refunds.service';

function makeService(opts: {
  orderTotal: number;
  existingRefunds: { amount: number; status: RefundStatus }[];
}) {
  const prisma = {
    order: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'MOM-1',
        customerId: null,
        total: opts.orderTotal,
        paymentStatus: 'paid',
      }),
    },
    refund: {
      // Mirrors the real query's `where: { status: { not: rejected } }` —
      // a mock that returned everything regardless of status would pass
      // trivially and never actually exercise the filter being tested.
      findMany: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            opts.existingRefunds
              .filter((r) => r.status !== RefundStatus.rejected)
              .map((r) => ({ amount: r.amount, status: r.status })),
          ),
        ),
      create: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ id: 'refund-new', ...data }),
        ),
    },
  };
  const ordersService = {
    updateStatus: jest.fn().mockResolvedValue(undefined),
  };
  const paymentsService = {};
  const auditLog = { log: jest.fn().mockResolvedValue(undefined) };
  const events = { emit: jest.fn() };

  const service = new RefundsService(
    prisma as never,
    ordersService as never,
    paymentsService as never,
    auditLog as never,
    events as never,
  );
  return { service, prisma };
}

describe('RefundsService.request', () => {
  it('allows a partial refund within the order total when nothing has been refunded yet', async () => {
    const { service } = makeService({ orderTotal: 100, existingRefunds: [] });

    await service.request(
      'MOM-1',
      { type: RefundType.partial, amount: 60, reason: 'wrong size' },
      { name: 'Admin' },
    );

    // no throw = success; nothing further to assert here beyond that
  });

  it('rejects a partial refund that exceeds the order total outright', async () => {
    const { service } = makeService({ orderTotal: 100, existingRefunds: [] });

    await expect(
      service.request(
        'MOM-1',
        { type: RefundType.partial, amount: 150, reason: 'goodwill' },
        { name: 'Admin' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a second refund that would push the combined claimed amount past the order total', async () => {
    // A 60-out-of-100 refund is already requested (not yet processed, but
    // still a live claim) — a second request for 60 more must be rejected,
    // not just checked against the raw order total.
    const { service } = makeService({
      orderTotal: 100,
      existingRefunds: [{ amount: 60, status: RefundStatus.requested }],
    });

    await expect(
      service.request(
        'MOM-1',
        { type: RefundType.partial, amount: 60, reason: 'second complaint' },
        { name: 'Admin' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('ignores rejected refunds when computing the remaining refundable balance', async () => {
    const { service } = makeService({
      orderTotal: 100,
      existingRefunds: [{ amount: 90, status: RefundStatus.rejected }],
    });

    // The 90 was rejected, so the full 100 should still be claimable.
    await service.request(
      'MOM-1',
      { type: RefundType.partial, amount: 100, reason: 'wrong size' },
      { name: 'Admin' },
    );
  });

  it('caps a "full" refund to whatever remains after a prior partial refund, not the original order total', async () => {
    const { service, prisma } = makeService({
      orderTotal: 100,
      existingRefunds: [{ amount: 40, status: RefundStatus.approved }],
    });

    await service.request(
      'MOM-1',
      { type: RefundType.full, reason: 'cancel rest of order' },
      { name: 'Admin' },
    );

    expect(prisma.refund.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 60 }),
      }),
    );
  });

  it('rejects any further refund once the full order total has already been claimed', async () => {
    const { service } = makeService({
      orderTotal: 100,
      existingRefunds: [{ amount: 100, status: RefundStatus.processed }],
    });

    await expect(
      service.request(
        'MOM-1',
        { type: RefundType.partial, amount: 1, reason: 'one more thing' },
        { name: 'Admin' },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
