import type { Prisma } from '@prisma/client';
import prisma from './prisma.js';
import { applyPlanCredit } from './plan-credit.js';

type SettlementTx = Pick<Prisma.TransactionClient, 'order' | 'user' | 'topup'>;

export interface SettlementClient {
  $transaction<T>(callback: (tx: SettlementTx) => Promise<T>): Promise<T>;
}

export interface SettlementInput {
  orderId: string;
  providerTradeNo: string;
  paidAmount: string | number;
  paidAt?: Date;
}

export function amountToCents(value: string | number): number {
  if (typeof value === 'string' && value.trim() === '') {
    throw new Error('PAYMENT_AMOUNT_INVALID');
  }
  const amount = typeof value === 'number' ? value : Number(value.trim());
  if (!Number.isFinite(amount) || amount < 0) throw new Error('PAYMENT_AMOUNT_INVALID');
  return Math.round((amount + Number.EPSILON) * 100);
}

export async function finalizePaidOrder(
  input: SettlementInput,
  client: SettlementClient = prisma,
): Promise<'credited' | 'already_paid'> {
  const orderId = input.orderId?.trim();
  const providerTradeNo = input.providerTradeNo?.trim();
  if (!orderId || !providerTradeNo) throw new Error('PAYMENT_IDENTIFIERS_REQUIRED');
  const paidAt = input.paidAt ?? new Date();
  if (Number.isNaN(paidAt.getTime())) throw new Error('PAYMENT_PAID_AT_INVALID');

  return client.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('ORDER_NOT_FOUND');
    if (amountToCents(order.amount) !== amountToCents(input.paidAmount)) {
      throw new Error('PAYMENT_AMOUNT_MISMATCH');
    }
    if (order.status === 'PAID') {
      if (order.providerTradeNo && order.providerTradeNo !== providerTradeNo) {
        throw new Error('PAYMENT_TRADE_MISMATCH');
      }
      return 'already_paid';
    }
    if (order.status !== 'PENDING') throw new Error('ORDER_NOT_PAYABLE');

    const duplicateTrade = await tx.order.findUnique({ where: { providerTradeNo } });
    if (duplicateTrade && duplicateTrade.id !== order.id) {
      throw new Error('PAYMENT_TRADE_REUSED');
    }

    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: 'PENDING' },
      data: { status: 'PAID', providerTradeNo, paidAt },
    });
    if (claimed.count !== 1) {
      const settled = await tx.order.findUnique({ where: { id: order.id } });
      if (settled?.status === 'PAID' && settled.providerTradeNo === providerTradeNo) {
        return 'already_paid';
      }
      throw new Error('PAYMENT_SETTLEMENT_CONFLICT');
    }

    await applyPlanCredit(tx, {
      userId: order.userId,
      planKey: order.planKey,
      quota: order.quota,
      price: order.amount,
      note: `在线支付 ${providerTradeNo}`,
      effectiveAt: paidAt,
    });
    return 'credited';
  });
}
