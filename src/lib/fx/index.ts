// FX conversion. Always reads the rate snapshot for the *current game week* so
// historical monetary values stay deterministic. Inspired by AHD's foreign-currency
// bug (changelog 2024-12-20): they used the live rate, which caused ledger values to
// shift when the user re-opened them in a different base currency. Per-week snapshot
// eliminates that drift.

import { db, prep } from "../db";

export interface FxRow {
  code: string;
  week: number;
  usdPerUnit: number;
}

export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
}

const rateCache = new Map<string, number>(); // `${code}:${week}` -> usdPerUnit

function getRateAt(code: string, week: number): number {
  if (code === "USD") return 1.0; // base, no read needed
  const cacheKey = `${code}:${week}`;
  const cached = rateCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const row = db
    .query<{ usdPerUnit: number }, [string, string, number]>(
      "SELECT usdPerUnit FROM fx_rates WHERE code = ? AND week = (SELECT MAX(week) FROM fx_rates WHERE code = ? AND week <= ?)"
    )
    .get(code, code, week);
  const rate = row?.usdPerUnit ?? 1.0; // safe default — assumes parity if no data
  rateCache.set(cacheKey, rate);
  return rate;
}

export function countryCurrency(countryId: string): string {
  const row = db
    .query<{ code: string }, [string]>(
      "SELECT code FROM country_currency WHERE countryId = ?"
    )
    .get(countryId);
  return row?.code ?? "USD";
}

export function listCurrencies(): CurrencyMeta[] {
  return prep<[], CurrencyMeta>("SELECT code, name, symbol FROM currencies ORDER BY code").all();
}

export function toUSD(amount: number, fromCurrency: string, week: number): number {
  if (fromCurrency === "USD") return amount;
  return amount * getRateAt(fromCurrency, week);
}

export function fromUSD(amountUSD: number, toCurrency: string, week: number): number {
  if (toCurrency === "USD") return amountUSD;
  const rate = getRateAt(toCurrency, week);
  if (rate === 0) return amountUSD;
  return amountUSD / rate;
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  week: number,
): number {
  if (fromCurrency === toCurrency) return amount;
  return fromUSD(toUSD(amount, fromCurrency, week), toCurrency, week);
}

// ── Tick-side: append a new rate snapshot for the given week. Stable rates by default
//    (±0.5% drift) so dev/test stays reproducible; pass volatility=0 to freeze.
export interface TickRatesOptions {
  driftPct?: number; // default 0.005 (±0.5%)
}

export function recordWeeklyRates(week: number, opts: TickRatesOptions = {}): number {
  const drift = opts.driftPct ?? 0.005;
  const codes = prep<[], { code: string }>("SELECT code FROM currencies WHERE code != 'USD'").all();
  const insert = prep<[string, number, number]>(
    "INSERT OR REPLACE INTO fx_rates (code, week, usdPerUnit) VALUES (?, ?, ?)"
  );
  let written = 0;
  for (const { code } of codes) {
    const prev = prep<[string, number], { usdPerUnit: number }>(
      "SELECT usdPerUnit FROM fx_rates WHERE code = ? AND week < ? ORDER BY week DESC LIMIT 1"
    ).get(code, week);
    if (!prev) continue;
    // Deterministic per-week jitter so replays match.
    const seed = (code.charCodeAt(0) * 31 + week * 7) % 1000;
    const delta = ((seed / 1000) - 0.5) * 2 * drift; // [-drift, +drift]
    const next = Math.max(0.0001, prev.usdPerUnit * (1 + delta));
    insert.run(code, week, next);
    rateCache.clear(); // week advanced; invalidate
    written++;
  }
  return written;
}
