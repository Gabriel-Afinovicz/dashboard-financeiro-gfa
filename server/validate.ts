const TX_TYPES = new Set(['receita', 'despesa']);
const METHODS = new Set(['pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'boleto', 'transferencia']);
const KINDS = new Set(['poupanca', 'cdb', 'tesouro', 'acoes', 'fiis', 'cripto', 'fundos', 'outro']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TransactionInput {
  type: string;
  description: string;
  amountCents: number;
  date: string;
  category: string;
  method: string;
  installmentsCount?: number;
  currentInstallment?: number;
}

export interface InvestmentInput {
  name: string;
  kind: string;
  amountCents: number;
  date: string;
  annualRatePct: number;
}

export interface FixedBillInput {
  description: string;
  amountCents: number;
  dayOfMonth: number;
  category: string;
  method: string;
  active: boolean;
  startsOn: string;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function isText(v: unknown, min: number, max: number): v is string {
  return typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;
}

function isCents(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= 99_999_999_999;
}

function isDate(v: unknown): v is string {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

export function parseTransaction(body: unknown): Result<TransactionInput> {
  const b = body as Partial<TransactionInput> | null;
  if (!b || typeof b !== 'object') return { ok: false, error: 'Corpo da requisição inválido.' };
  if (typeof b.type !== 'string' || !TX_TYPES.has(b.type)) return { ok: false, error: 'Tipo inválido.' };
  if (!isText(b.description, 2, 60)) return { ok: false, error: 'Descrição inválida (2 a 60 caracteres).' };
  if (!isCents(b.amountCents)) return { ok: false, error: 'Valor inválido.' };
  if (!isDate(b.date)) return { ok: false, error: 'Data inválida.' };
  if (!isText(b.category, 1, 40)) return { ok: false, error: 'Categoria inválida.' };
  if (typeof b.method !== 'string' || !METHODS.has(b.method)) return { ok: false, error: 'Método de pagamento inválido.' };

  const instCount = typeof b.installmentsCount === 'number' && Number.isInteger(b.installmentsCount) && b.installmentsCount >= 1 && b.installmentsCount <= 36 ? b.installmentsCount : 1;
  const curInst = typeof b.currentInstallment === 'number' && Number.isInteger(b.currentInstallment) && b.currentInstallment >= 1 && b.currentInstallment <= instCount ? b.currentInstallment : 1;

  return {
    ok: true,
    value: {
      type: b.type,
      description: b.description!.trim(),
      amountCents: b.amountCents!,
      date: b.date!,
      category: b.category!.trim(),
      method: b.method,
      installmentsCount: instCount,
      currentInstallment: curInst,
    },
  };
}

export function parseInvestment(body: unknown): Result<InvestmentInput> {
  const b = body as Partial<InvestmentInput> | null;
  if (!b || typeof b !== 'object') return { ok: false, error: 'Corpo da requisição inválido.' };
  if (!isText(b.name, 2, 60)) return { ok: false, error: 'Nome inválido (2 a 60 caracteres).' };
  if (typeof b.kind !== 'string' || !KINDS.has(b.kind)) return { ok: false, error: 'Tipo de investimento inválido.' };
  if (!isCents(b.amountCents)) return { ok: false, error: 'Valor aplicado inválido.' };
  if (!isDate(b.date)) return { ok: false, error: 'Data de aplicação inválida.' };
  if (typeof b.annualRatePct !== 'number' || !Number.isFinite(b.annualRatePct) || b.annualRatePct < 0 || b.annualRatePct > 500) {
    return { ok: false, error: 'Taxa anual inválida (0 a 500).' };
  }
  return {
    ok: true,
    value: {
      name: b.name!.trim(),
      kind: b.kind,
      amountCents: b.amountCents!,
      date: b.date!,
      annualRatePct: b.annualRatePct,
    },
  };
}

export interface FixedBillInput {
  description: string;
  amountCents: number;
  currency?: string;
  amountCentsUSD?: number;
  dayOfMonth: number;
  category: string;
  method: string;
  active: boolean;
  startsOn: string;
}

export function parseFixedBill(body: unknown): Result<FixedBillInput> {
  const b = body as Partial<FixedBillInput> | null;
  if (!b || typeof b !== 'object') return { ok: false, error: 'Corpo da requisição inválido.' };
  if (!isText(b.description, 2, 60)) return { ok: false, error: 'Descrição inválida.' };
  if (!isCents(b.amountCents)) return { ok: false, error: 'Valor inválido.' };
  if (typeof b.dayOfMonth !== 'number' || !Number.isInteger(b.dayOfMonth) || b.dayOfMonth < 1 || b.dayOfMonth > 31) {
    return { ok: false, error: 'Dia do mês inválido (1 a 31).' };
  }
  if (!isText(b.category, 1, 40)) return { ok: false, error: 'Categoria inválida.' };
  if (typeof b.method !== 'string' || !METHODS.has(b.method)) return { ok: false, error: 'Método inválido.' };

  const currency = b.currency === 'USD' ? 'USD' : 'BRL';
  const amountCentsUSD = currency === 'USD' && isCents(b.amountCentsUSD) ? b.amountCentsUSD : undefined;

  return {
    ok: true,
    value: {
      description: b.description!.trim(),
      amountCents: b.amountCents!,
      currency,
      amountCentsUSD,
      dayOfMonth: b.dayOfMonth!,
      category: b.category!.trim(),
      method: b.method,
      active: b.active !== false,
      startsOn: isDate(b.startsOn) ? b.startsOn : new Date().toISOString().slice(0, 10),
    },
  };
}
