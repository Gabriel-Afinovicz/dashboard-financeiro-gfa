import { CURRENCY_RE, DESCRIPTION_RE, PERCENT_RE, currencyToCents, isValidISODate, percentToNumber, todayISO } from './format';

export interface TransactionFormValues {
  description: string;
  amount: string; // mascarado "1.234,56"
  date: string; // ISO
  category: string;
}

export interface InvestmentFormValues {
  name: string;
  amount: string;
  date: string;
  rate: string; // mascarado "12,5"
}

export type Errors<T> = Partial<Record<keyof T, string>>;

export function validateTransaction(v: TransactionFormValues): Errors<TransactionFormValues> {
  const errors: Errors<TransactionFormValues> = {};

  if (!v.description.trim()) {
    errors.description = 'Informe uma descrição.';
  } else if (!DESCRIPTION_RE.test(v.description.trim())) {
    errors.description = 'Use de 2 a 60 caracteres (letras, números e pontuação simples).';
  }

  if (!v.amount) {
    errors.amount = 'Informe o valor.';
  } else if (!CURRENCY_RE.test(v.amount)) {
    errors.amount = 'Valor inválido. Ex.: 1.234,56';
  } else if (currencyToCents(v.amount) <= 0) {
    errors.amount = 'O valor deve ser maior que zero.';
  }

  if (!v.date) {
    errors.date = 'Informe a data.';
  } else if (!isValidISODate(v.date)) {
    errors.date = 'Data inválida.';
  } else if (v.date > todayISO()) {
    errors.date = 'A data não pode estar no futuro.';
  } else if (v.date < '2000-01-01') {
    errors.date = 'Use uma data a partir de 01/01/2000.';
  }

  if (!v.category) {
    errors.category = 'Escolha uma categoria.';
  }

  return errors;
}

export function validateInvestment(v: InvestmentFormValues): Errors<InvestmentFormValues> {
  const errors: Errors<InvestmentFormValues> = {};

  if (!v.name.trim()) {
    errors.name = 'Informe um nome.';
  } else if (!DESCRIPTION_RE.test(v.name.trim())) {
    errors.name = 'Use de 2 a 60 caracteres (letras, números e pontuação simples).';
  }

  if (!v.amount) {
    errors.amount = 'Informe o valor aplicado.';
  } else if (!CURRENCY_RE.test(v.amount)) {
    errors.amount = 'Valor inválido. Ex.: 1.000,00';
  } else if (currencyToCents(v.amount) <= 0) {
    errors.amount = 'O valor deve ser maior que zero.';
  }

  if (!v.date) {
    errors.date = 'Informe a data da aplicação.';
  } else if (!isValidISODate(v.date)) {
    errors.date = 'Data inválida.';
  } else if (v.date > todayISO()) {
    errors.date = 'A data não pode estar no futuro.';
  } else if (v.date < '2000-01-01') {
    errors.date = 'Use uma data a partir de 01/01/2000.';
  }

  const normalizedRate = v.rate.replace(/,$/, '');
  if (!normalizedRate) {
    errors.rate = 'Informe a taxa anual esperada.';
  } else if (!PERCENT_RE.test(normalizedRate)) {
    errors.rate = 'Taxa inválida. Ex.: 12,5';
  } else {
    const n = percentToNumber(normalizedRate);
    if (Number.isNaN(n) || n < 0 || n > 500) {
      errors.rate = 'Use uma taxa entre 0% e 500% ao ano.';
    }
  }

  return errors;
}
