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

/**
 * Calcula a taxa efetiva do dólar no cartão de crédito incluindo o Spread do banco e o IOF federal.
 * Fórmula: Dólar Efetivo = Dólar Comercial * (1 + Spread%) * (1 + IOF%)
 */
export function calculateEffectiveUsdRate(baseRate: number, spreadPct = 5.5, iofPct = 4.38): number {
  const withSpread = baseRate * (1 + spreadPct / 100);
  const withIof = withSpread * (1 + iofPct / 100);
  return withIof;
}
