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
  /** Total de parcelas da compra (ex: 6). Quando 1 ou não informado, é compra à vista. */
  installmentsCount?: number;
  /** Número da parcela atual (ex: 1 para 1/6). */
  currentInstallment?: number;
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

/** Conta que se repete todo mês no mesmo dia (água, luz, Netflix…). */
export interface FixedBill {
  id: string;
  description: string;
  /** Valor em centavos de BRL (sempre despesa). */
  amountCents: number;
  /** Moeda da conta fixa ('BRL' | 'USD'). Padrão 'BRL'. */
  currency?: 'BRL' | 'USD';
  /** Valor original em centavos de Dólar quando currency === 'USD' (ex.: 2000 para $ 20,00). */
  amountCentsUSD?: number;
  /** Dia do mês em que a fatura cai (1–31). Meses curtos usam o último dia. */
  dayOfMonth: number;
  category: string;
  method: PaymentMethod;
  /** Se false, a conta não entra nos totais (pausa). */
  active: boolean;
  /** A partir desta data a conta passa a valer (ISO yyyy-mm-dd). */
  startsOn: string;
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
  /** Dia de fechamento/corte da fatura do cartão de crédito (1-31). */
  creditCardClosingDay: number;
  /** Dia de vencimento da fatura do cartão de crédito (1-31). */
  creditCardDueDay: number;
  /** Percentual de Spread cobrado pelo banco em compras internacionais (ex: 5.5). */
  cardSpreadPct: number;
  /** Percentual de IOF federal para compras internacionais no cartão (ex: 4.38). */
  cardIofPct: number;
}
