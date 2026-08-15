import type { InvestmentKind, PaymentMethod, TransactionType } from '../types';

export const INCOME_CATEGORIES = [
  'Salário',
  'Freelance',
  'Vendas',
  'Rendimentos',
  'Presente',
  'Reembolso',
  'Outros',
] as const;

export const EXPENSE_CATEGORIES = [
  'Alimentação',
  'Moradia',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Compras',
  'Assinaturas',
  'Contas',
  'Impostos',
  'Outros',
] as const;

export function categoriesFor(type: TransactionType): readonly string[] {
  return type === 'receita' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; short: string }[] = [
  { value: 'pix', label: 'Pix', short: 'Pix' },
  { value: 'cartao_credito', label: 'Cartão de crédito', short: 'Crédito' },
  { value: 'cartao_debito', label: 'Cartão de débito', short: 'Débito' },
  { value: 'dinheiro', label: 'Dinheiro', short: 'Dinheiro' },
  { value: 'boleto', label: 'Boleto', short: 'Boleto' },
  { value: 'transferencia', label: 'Transferência', short: 'Transf.' },
];

export const METHOD_LABELS: Record<PaymentMethod, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.label]),
) as Record<PaymentMethod, string>;

export const METHOD_SHORT: Record<PaymentMethod, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.short]),
) as Record<PaymentMethod, string>;

export const INVESTMENT_KINDS: { value: InvestmentKind; label: string }[] = [
  { value: 'poupanca', label: 'Poupança' },
  { value: 'cdb', label: 'CDB / RDB' },
  { value: 'tesouro', label: 'Tesouro Direto' },
  { value: 'acoes', label: 'Ações' },
  { value: 'fiis', label: 'Fundos Imobiliários (FIIs)' },
  { value: 'cripto', label: 'Criptomoedas' },
  { value: 'fundos', label: 'Fundos de investimento' },
  { value: 'outro', label: 'Outro' },
];

export const KIND_LABELS: Record<InvestmentKind, string> = Object.fromEntries(
  INVESTMENT_KINDS.map((k) => [k.value, k.label]),
) as Record<InvestmentKind, string>;
