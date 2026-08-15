export type TransactionType = 'receita' | 'despesa';

export type PaymentMethod =
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'dinheiro'
  | 'boleto'
  | 'transferencia';

export type InvestmentKind =
  | 'poupanca'
  | 'cdb'
  | 'tesouro'
  | 'acoes'
  | 'fiis'
  | 'cripto'
  | 'fundos'
  | 'outro';

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  /** Valor em centavos (sempre positivo; o tipo define o sinal). */
  amountCents: number;
  /** Data no formato ISO yyyy-mm-dd. */
  date: string;
  category: string;
  method: PaymentMethod;
  createdAt: string;
}

export interface Investment {
  id: string;
  name: string;
  kind: InvestmentKind;
  /** Valor aplicado em centavos. */
  amountCents: number;
  /** Data da aplicação (ISO yyyy-mm-dd). */
  date: string;
  /** Taxa anual esperada, em % (ex.: 12.5). */
  annualRatePct: number;
  createdAt: string;
}

export interface DataStore {
  version: 1;
  transactions: Transaction[];
  investments: Investment[];
  /** Indica que os dados atuais são o exemplo inicial. */
  sampleData: boolean;
}

export type ThemeMode = 'dark' | 'light';
export type FontOption = 'inter' | 'poppins' | 'space' | 'jetbrains' | 'system';

export interface Settings {
  theme: ThemeMode;
  /** 'auto' (preto/branco conforme tema) ou cor hex (#rrggbb). */
  accent: string;
  font: FontOption;
  /** Multiplicador do tamanho base do texto (0.875 | 1 | 1.125). */
  fontScale: number;
  animations: boolean;
  /** Modo privado: oculta os valores monetários. */
  privacy: boolean;
  initialBalanceCents: number;
  monthlyGoalCents: number;
}
