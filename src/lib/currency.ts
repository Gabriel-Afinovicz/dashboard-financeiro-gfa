import { useEffect, useState } from 'react';

let cachedRate: { rate: number; timestamp: number } | null = null;
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutos
const DEFAULT_FALLBACK_RATE = 5.65;

export async function fetchUsdRate(): Promise<number> {
  if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_DURATION_MS) {
    return cachedRate.rate;
  }

  try {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { USDBRL?: { bid?: string } };
    const bid = data.USDBRL?.bid;
    if (bid) {
      const parsed = parseFloat(bid);
      if (!isNaN(parsed) && parsed > 0) {
        cachedRate = { rate: parsed, timestamp: Date.now() };
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[AwesomeAPI] Erro ao buscar cotação do dólar, usando cotação padrão:', err);
  }

  return cachedRate?.rate ?? DEFAULT_FALLBACK_RATE;
}

export function useUsdRate(): { usdRate: number; loading: boolean } {
  const [usdRate, setUsdRate] = useState<number>(cachedRate?.rate ?? DEFAULT_FALLBACK_RATE);
  const [loading, setLoading] = useState<boolean>(!cachedRate);

  useEffect(() => {
    let active = true;
    fetchUsdRate().then((rate) => {
      if (active) {
        setUsdRate(rate);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return { usdRate, loading };
}

const historicalRatesCache = new Map<string, number>();

/**
 * Busca a cotação comercial do dólar para uma data específica (yyyy-mm-dd).
 * Se a data for hoje ou no futuro, retorna a cotação atual.
 */
export async function fetchUsdRateForDate(isoDate: string): Promise<number> {
  const todayStr = new Date().toISOString().slice(0, 10);
  if (isoDate >= todayStr) {
    return fetchUsdRate();
  }

  if (historicalRatesCache.has(isoDate)) {
    return historicalRatesCache.get(isoDate)!;
  }

  const yyyymmdd = isoDate.replace(/-/g, '');
  try {
    const res = await fetch(`https://economia.awesomeapi.com.br/json/daily/USD-BRL/?start_date=${yyyymmdd}&end_date=${yyyymmdd}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Array<{ bid?: string }>;
    if (Array.isArray(data) && data.length > 0 && data[0].bid) {
      const parsed = parseFloat(data[0].bid);
      if (!isNaN(parsed) && parsed > 0) {
        historicalRatesCache.set(isoDate, parsed);
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`[AwesomeAPI] Erro ao buscar cotação histórica para ${isoDate}:`, err);
  }

  const fallback = await fetchUsdRate();
  historicalRatesCache.set(isoDate, fallback);
  return fallback;
}

/** Hook que busca a cotação do dólar para uma data específica (yyyy-mm-dd). */
export function useUsdRateForDate(isoDate: string): { usdRate: number; loading: boolean } {
  const [usdRate, setUsdRate] = useState<number>(cachedRate?.rate ?? DEFAULT_FALLBACK_RATE);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    if (!isoDate) return;
    setLoading(true);
    fetchUsdRateForDate(isoDate).then((rate) => {
      if (active) {
        setUsdRate(rate);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [isoDate]);

  return { usdRate, loading };
}

/** Hook que busca e armazena cotações históricas para uma lista de datas ISO. */
export function useHistoricalUsdRates(dates: string[]): Record<string, number> {
  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    const uniqueDates = Array.from(new Set(dates.filter(Boolean)));
    const missing = uniqueDates.filter((d) => rates[d] === undefined);
    if (missing.length === 0) return;

    Promise.all(
      missing.map(async (d) => {
        const rate = await fetchUsdRateForDate(d);
        return [d, rate] as const;
      }),
    ).then((entries) => {
      if (active) {
        setRates((prev) => {
          const updated = { ...prev };
          for (const [d, r] of entries) {
            updated[d] = r;
          }
          return updated;
        });
      }
    });

    return () => {
      active = false;
    };
  }, [dates.join(',')]);

  return rates;
}

/**
 * Calcula a taxa efetiva do dólar no cartão de crédito incluindo o Spread do banco e o IOF federal.
 * Fórmula: Dólar Efetivo = Dólar Comercial * (1 + Spread%) * (1 + IOF%)
 */
export function calculateEffectiveUsdRate(baseRate: number, spreadPct = 5.5, iofPct = 4.38): number {
  const withSpread = baseRate * (1 + spreadPct / 100);
  const withIof = withSpread * (1 + iofPct / 100);
  return withIof;
}
