import { createHash, randomBytes, randomUUID } from 'node:crypto';
import prisma from './prisma.js';
import { applyPlanCredit, type PlanCreditTransaction } from './plan-credit.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_BODY_LENGTH = 20;
const MAX_BATCH_SIZE = 100;

export interface RedemptionCodeRecord {
  id: string;
  codeHash: string;
  codeHint: string;
  planKey: string;
  quota: number;
  price: number;
  source: string;
  batchId: string | null;
  note: string | null;
  redeemedById: string | null;
  redeemedAt: Date | null;
  expiresAt: Date | null;
}

export interface RedemptionTransaction extends PlanCreditTransaction {
  redemptionCode: {
    findUnique(args: {
      where: { codeHash?: string; id?: string };
    }): Promise<RedemptionCodeRecord | null>;
    updateMany(args: {
      where: {
        id: string;
        redeemedAt: null;
        OR: Array<{ expiresAt: null } | { expiresAt: { gt: Date } }>;
      };
      data: { redeemedById: string; redeemedAt: Date };
    }): Promise<{ count: number }>;
  };
}

export interface RedemptionClient {
  $transaction<T>(callback: (tx: RedemptionTransaction) => Promise<T>): Promise<T>;
}

interface RedemptionCreateRecord {
  codeHash: string;
  codeHint: string;
  planKey: string;
  quota: number;
  price: number;
  source: string;
  batchId: string;
  note?: string;
  expiresAt?: Date;
}

export interface RedemptionGenerationClient {
  redemptionCode: {
    createMany(args: { data: RedemptionCreateRecord[] }): Promise<{ count: number }>;
  };
}

export interface CreateRedemptionCodesInput {
  planKey: string;
  quota: number;
  price?: number;
  quantity?: number;
  source?: string;
  note?: string;
  expiresAt?: Date | null;
}

export interface RedemptionGenerationOptions {
  generateCode?: () => string;
  generateBatchId?: () => string;
}

export interface RedeemPlanCodeInput {
  userId: string;
  code: string;
  redeemedAt?: Date;
}

export interface RedeemPlanCodeResult {
  status: 'redeemed' | 'already_redeemed';
  redemption: {
    planKey: string;
    quota: number;
    source: string;
  };
  user: {
    id: string;
    plan: string;
    quota: number;
    planExpiresAt: Date | null;
  };
}

export function normalizeRedemptionCode(value: string): string {
  if (typeof value !== 'string' || value.length > 80) {
    throw new Error('REDEMPTION_CODE_INVALID');
  }
  const canonical = value.trim().toUpperCase().replace(/[\s-]/g, '');
  const pattern = new RegExp(`^PF[${CODE_ALPHABET}]{${CODE_BODY_LENGTH}}$`);
  if (!pattern.test(canonical)) throw new Error('REDEMPTION_CODE_INVALID');
  return canonical;
}

function formatCanonicalCode(canonical: string): string {
  const body = canonical.slice(2);
  return `PF-${body.match(/.{1,5}/g)?.join('-') ?? body}`;
}

export function hashRedemptionCode(value: string): string {
  return createHash('sha256').update(normalizeRedemptionCode(value), 'utf8').digest('hex');
}

function generateSecureCode(): string {
  const bytes = randomBytes(CODE_BODY_LENGTH);
  let body = '';
  for (const byte of bytes) body += CODE_ALPHABET[byte & 31];
  return formatCanonicalCode(`PF${body}`);
}

function validateGenerationInput(input: CreateRedemptionCodesInput) {
  const planKey = input.planKey?.trim();
  if (!planKey || !/^[a-z0-9_-]{1,40}$/i.test(planKey) || planKey === 'free') {
    throw new Error('REDEMPTION_PLAN_INVALID');
  }
  if (!Number.isSafeInteger(input.quota) || input.quota <= 0 || input.quota > 1_000_000) {
    throw new Error('REDEMPTION_QUOTA_INVALID');
  }
  const quantity = input.quantity ?? 1;
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_BATCH_SIZE) {
    throw new Error('REDEMPTION_QUANTITY_INVALID');
  }
  const price = input.price ?? 0;
  if (!Number.isFinite(price) || price < 0) throw new Error('REDEMPTION_PRICE_INVALID');
  const source = input.source?.trim() || 'manual';
  if (!/^[a-z0-9._-]{1,40}$/i.test(source)) throw new Error('REDEMPTION_SOURCE_INVALID');
  if (input.note && input.note.length > 200) throw new Error('REDEMPTION_NOTE_INVALID');
  if (input.expiresAt && Number.isNaN(input.expiresAt.getTime())) {
    throw new Error('REDEMPTION_EXPIRY_INVALID');
  }
  return { planKey, quantity, price, source };
}

export async function createRedemptionCodes(
  input: CreateRedemptionCodesInput,
  client: RedemptionGenerationClient = prisma as unknown as RedemptionGenerationClient,
  options: RedemptionGenerationOptions = {},
) {
  const { planKey, quantity, price, source } = validateGenerationInput(input);
  const generateCode = options.generateCode ?? generateSecureCode;
  const batchId = (options.generateBatchId ?? randomUUID)();
  const plaintextCodes = new Set<string>();

  while (plaintextCodes.size < quantity) {
    const displayCode = formatCanonicalCode(normalizeRedemptionCode(generateCode()));
    plaintextCodes.add(displayCode);
  }

  const codes = [...plaintextCodes];
  const data: RedemptionCreateRecord[] = codes.map((code) => {
    const canonical = normalizeRedemptionCode(code);
    return {
      codeHash: hashRedemptionCode(canonical),
      codeHint: canonical.slice(-4),
      planKey,
      quota: input.quota,
      price,
      source,
      batchId,
      ...(input.note ? { note: input.note } : {}),
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    };
  });

  const inserted = await client.redemptionCode.createMany({ data });
  if (inserted.count !== data.length) throw new Error('REDEMPTION_GENERATION_CONFLICT');

  return { batchId, codes };
}

async function idempotentResult(
  tx: RedemptionTransaction,
  code: RedemptionCodeRecord,
  userId: string,
): Promise<RedeemPlanCodeResult> {
  if (code.redeemedById !== userId) throw new Error('REDEMPTION_CODE_USED');
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('USER_NOT_FOUND');
  return {
    status: 'already_redeemed',
    redemption: { planKey: code.planKey, quota: code.quota, source: code.source },
    user,
  };
}

export async function redeemPlanCode(
  input: RedeemPlanCodeInput,
  client: RedemptionClient = prisma as unknown as RedemptionClient,
): Promise<RedeemPlanCodeResult> {
  const userId = input.userId?.trim();
  if (!userId) throw new Error('USER_NOT_FOUND');
  const codeHash = hashRedemptionCode(input.code);
  const redeemedAt = input.redeemedAt ?? new Date();
  if (Number.isNaN(redeemedAt.getTime())) throw new Error('REDEMPTION_TIME_INVALID');

  return client.$transaction(async (tx) => {
    let code = await tx.redemptionCode.findUnique({ where: { codeHash } });
    if (!code) throw new Error('REDEMPTION_CODE_INVALID');
    if (code.redeemedAt) return idempotentResult(tx, code, userId);
    if (code.expiresAt && code.expiresAt <= redeemedAt) {
      throw new Error('REDEMPTION_CODE_EXPIRED');
    }

    const claimed = await tx.redemptionCode.updateMany({
      where: {
        id: code.id,
        redeemedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: redeemedAt } },
        ],
      },
      data: { redeemedById: userId, redeemedAt },
    });

    if (claimed.count !== 1) {
      code = await tx.redemptionCode.findUnique({ where: { id: code.id } });
      if (!code) throw new Error('REDEMPTION_CODE_INVALID');
      if (code.redeemedAt) return idempotentResult(tx, code, userId);
      throw new Error('REDEMPTION_CODE_EXPIRED');
    }

    const user = await applyPlanCredit(tx, {
      userId,
      planKey: code.planKey,
      quota: code.quota,
      price: code.price,
      effectiveAt: redeemedAt,
      note: `兑换码 ${code.source}:${code.codeHint}`,
    });

    return {
      status: 'redeemed',
      redemption: { planKey: code.planKey, quota: code.quota, source: code.source },
      user,
    };
  });
}
