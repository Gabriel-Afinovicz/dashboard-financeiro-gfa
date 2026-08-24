import { describe, expect, it } from 'vitest';
import {
  CURRENCY_RE,
  DESCRIPTION_RE,
  PERCENT_RE,
  currencyToCents,
  formatDateBR,
  isValidISODate,
  maskCurrency,
  maskPercent,
  monthLabel,
  nextBusinessDay,
  percentToNumber,
} from './format';

describe('máscara de moeda', () => {
  it('formata dígitos como centavos', () => {
    expect(maskCurrency('1')).toBe('0,01');
    expect(maskCurrency('50')).toBe('0,50');
    expect(maskCurrency('500')).toBe('5,00');
    expect(maskCurrency('123456')).toBe('1.234,56');
    expect(maskCurrency('123456789')).toBe('1.234.567,89');
  });

  it('ignora caracteres inválidos e zeros à esquerda', () => {
    expect(maskCurrency('abc12x3')).toBe('1,23');
    expect(maskCurrency('0000500')).toBe('5,00');
    expect(maskCurrency('')).toBe('');
  });

  it('regex valida o formato final', () => {
    expect(CURRENCY_RE.test('1.234,56')).toBe(true);
    expect(CURRENCY_RE.test('0,50')).toBe(true);
    expect(CURRENCY_RE.test('1234,56')).toBe(false);
    expect(CURRENCY_RE.test('1.234')).toBe(false);
    expect(CURRENCY_RE.test('12,3')).toBe(false);
  });

  it('converte máscara para centavos (ida e volta)', () => {
    expect(currencyToCents('1.234,56')).toBe(123456);
    expect(currencyToCents(maskCurrency('987654'))).toBe(987654);
  });
});

describe('máscara de percentual', () => {
  it('mantém dígitos e uma vírgula com 2 casas', () => {
    expect(maskPercent('12,5')).toBe('12,5');
    expect(maskPercent('12,555')).toBe('12,55');
    expect(maskPercent('1a2,5%')).toBe('12,5');
    expect(maskPercent('1,2,3')).toBe('1,23');
    expect(maskPercent('12345')).toBe('123');
  });

  it('regex e conversão', () => {
    expect(PERCENT_RE.test('12')).toBe(true);
    expect(PERCENT_RE.test('12,5')).toBe(true);
    expect(PERCENT_RE.test('12,')).toBe(false);
    expect(PERCENT_RE.test(',5')).toBe(false);
    expect(percentToNumber('12,5')).toBe(12.5);
  });
});

describe('datas', () => {
  it('valida datas reais', () => {
    expect(isValidISODate('2026-08-14')).toBe(true);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('14/08/2026')).toBe(false);
  });

  it('formata para pt-BR', () => {
    expect(formatDateBR('2026-08-14')).toBe('14/08/2026');
    expect(monthLabel('2026-08')).toMatch(/ago\/26/);
  });

  it('ajusta Sábado e Domingo para a próxima Segunda-feira (dia útil)', () => {
    // 2026-08-15 é Sábado -> Segunda 2026-08-17
    const sat = new Date(2026, 7, 15);
    expect(nextBusinessDay(sat).getDate()).toBe(17);

    // 2026-08-16 é Domingo -> Segunda 2026-08-17
    const sun = new Date(2026, 7, 16);
    expect(nextBusinessDay(sun).getDate()).toBe(17);

    // 2026-08-17 é Segunda -> permanece 17
    const mon = new Date(2026, 7, 17);
    expect(nextBusinessDay(mon).getDate()).toBe(17);
  });
});

describe('descrição', () => {
  it('aceita texto normal e recusa símbolos estranhos', () => {
    expect(DESCRIPTION_RE.test('Supermercado da semana')).toBe(true);
    expect(DESCRIPTION_RE.test('Uber & 99 (ida/volta) - 2x')).toBe(true);
    expect(DESCRIPTION_RE.test('a')).toBe(false);
    expect(DESCRIPTION_RE.test('teste <script>')).toBe(false);
  });
});
