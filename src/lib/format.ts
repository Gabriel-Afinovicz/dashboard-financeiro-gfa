const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

/** Formata centavos como moeda BRL (ex.: 123456 -> "R$ 1.234,56"). */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/** Formato compacto para eixos de gráfico (ex.: 250000 -> "R$ 2,5 mil"). */
export function formatBRLCompact(cents: number): string {
  return 'R$ ' + compact.format(cents / 100);
}

/** Regex de validação do valor monetário mascarado: 1.234,56 */
export const CURRENCY_RE = /^\d{1,3}(\.\d{3})*,\d{2}$/;

/**
 * Máscara de moeda: recebe qualquer texto digitado e devolve "1.234,56".
 * Interpreta os dígitos como centavos (digitar "1" -> "0,01").
 */
export function maskCurrency(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 11);
  if (!digits) return '';
  const padded = digits.padStart(3, '0');
  const int = padded.slice(0, -2);
  const dec = padded.slice(-2);
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec;
}

/** Converte o valor mascarado ("1.234,56") para centavos (123456). */
export function currencyToCents(masked: string): number {
  const digits = masked.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

/** Regex de validação de percentual: "12" ou "12,5" ou "12,50" (0–999,99). */
export const PERCENT_RE = /^\d{1,3}(,\d{1,2})?$/;

/** Máscara de percentual: mantém dígitos e uma vírgula, máx. 2 casas decimais. */
export function maskPercent(raw: string): string {
  let s = raw.replace(/[^\d,]/g, '');
  const firstComma = s.indexOf(',');
  if (firstComma !== -1) {
    s = s.slice(0, firstComma + 1) + s.slice(firstComma + 1).replace(/,/g, '');
  }
  const [i, d = ''] = s.split(',');
  const int = i.slice(0, 3);
  const dec = d.slice(0, 2);
  return s.includes(',') ? `${int},${dec}` : int;
}

/** Converte percentual mascarado ("12,5") para número (12.5). */
export function percentToNumber(masked: string): number {
  const clean = masked.replace(/,$/, '');
  return clean ? parseFloat(clean.replace(',', '.')) : NaN;
}

/** Formata número como percentual pt-BR (12.34 -> "12,3%"). */
export function formatPercent(value: number, digits = 1): string {
  return (
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(value) + '%'
  );
}

/** Regex de data ISO yyyy-mm-dd. */
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Regex de descrição: letras, números, espaços e pontuação básica (2–60 chars). */
export const DESCRIPTION_RE = /^[\p{L}\p{N} .,()\/&+'-]{2,60}$/u;

export function isValidISODate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** Converte ISO yyyy-mm-dd em Date local (evita deslocamento de fuso). */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

/** "2026-08-14" -> "14/08/2026" */
export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** "2026-08" -> "ago/26" */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const name = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(new Date(y, m - 1, 1))
    .replace('.', '');
  return `${name}/${String(y).slice(2)}`;
}

/** Adiciona N meses a uma data ISO (yyyy-mm-dd), ajustando o dia se o mês for mais curto. */
export function addMonthsToISO(iso: string, monthsToAdd: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const targetMonthIndex = m - 1 + monthsToAdd;
  const targetYear = y + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const day = Math.min(d, lastDay);
  return `${targetYear}-${String(normalizedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Se a data cair no Sábado (6) ou Domingo (0), avança para a próxima Segunda-feira (dia útil bancário).
 */
export function nextBusinessDay(d: Date): Date {
  const result = new Date(d);
  const dayOfWeek = result.getDay();
  if (dayOfWeek === 6) {
    result.setDate(result.getDate() + 2);
  } else if (dayOfWeek === 0) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}
