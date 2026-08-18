import type { SimulatedTrade, SimResult } from "@/types/database";
import { startOfWeek, startOfMonth, isAfter, parseISO } from "date-fns";

// ============================================================
// SIMULATED TRADE STATS
// ============================================================
export interface SimStats {
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  totalPnL: number;
  avgR: number;
  profitFactor: number;
  maxDrawdown: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
}

export function calculateSimStats(trades: SimulatedTrade[]): SimStats {
  const closed = trades.filter((t): t is SimulatedTrade & { result: Exclude<SimResult, "pending"> } =>
    t.result !== "pending"
  );
  const wins = closed.filter((t) => t.result === "win");
  const losses = closed.filter((t) => t.result === "loss");
  const breakeven = closed.filter((t) => t.result === "breakeven");

  const totalPnL = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const winPnL = wins.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const lossPnL = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0));

  const rValues = closed.map((t) => t.r_multiple).filter((v): v is number => v != null);
  const avgR = rValues.length > 0 ? rValues.reduce((a, b) => a + b, 0) / rValues.length : 0;

  const avgWin =
    wins.length > 0 ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length : 0;
  const avgLoss =
    losses.length > 0
      ? Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length)
      : 0;

  const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
  const profitFactor = lossPnL > 0 ? winPnL / lossPnL : winPnL > 0 ? Infinity : 0;
  const expectancy =
    closed.length > 0
      ? (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss
      : 0;

  // Max drawdown from cumulative P/L
  let peak = 0;
  let maxDrawdown = 0;
  let cumulative = 0;
  const sorted = [...closed].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );
  for (const t of sorted) {
    cumulative += t.pnl ?? 0;
    if (cumulative > peak) peak = cumulative;
    const dd = peak - cumulative;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  return {
    totalTrades: closed.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    winRate,
    totalPnL,
    avgR,
    profitFactor: profitFactor === Infinity ? 0 : profitFactor,
    maxDrawdown,
    avgWin,
    avgLoss,
    expectancy,
  };
}

export function filterSimByPeriod(
  trades: SimulatedTrade[],
  period: "today" | "week" | "month" | "all"
): SimulatedTrade[] {
  if (period === "all") return trades;
  const now = new Date();
  if (period === "today") {
    const today = now.toISOString().split("T")[0];
    return trades.filter((t) => t.trade_date === today);
  }
  const start =
    period === "week"
      ? startOfWeek(now, { weekStartsOn: 1 })
      : startOfMonth(now);

  return trades.filter((t) => {
    const date = parseISO(t.trade_date);
    return isAfter(date, start) || date.getTime() === start.getTime();
  });
}

// ============================================================
// RISK CALCULATION (pure utility — no DB needed)
// ============================================================
export interface RiskCalculation {
  dollarRisk: number;
  stopDistance: number;
  stopPips: number;
  positionSize: number;
  lotSize: number;
  potentialProfit: number;
  riskRewardRatio: number;
  exceedsMaxRisk: boolean;
}

export function calculateRisk(params: {
  accountBalance: number;
  riskPercent: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number;
  pipSize?: number;
  pipValue?: number;
  maxRiskPercent?: number;
}): RiskCalculation {
  const {
    accountBalance,
    riskPercent,
    entryPrice,
    stopLoss,
    takeProfit,
    pipSize = 0.0001,
    pipValue = 10,
    maxRiskPercent = 2,
  } = params;

  const dollarRisk = accountBalance * (riskPercent / 100);
  const stopDistance = Math.abs(entryPrice - stopLoss);
  const stopPips = pipSize > 0 ? stopDistance / pipSize : 0;
  const lotSize = stopPips > 0 ? dollarRisk / (stopPips * pipValue) : 0;
  const positionSize = lotSize * 100000;

  let potentialProfit = 0;
  let riskRewardRatio = 0;
  if (takeProfit) {
    const rewardDistance = Math.abs(takeProfit - entryPrice);
    const rewardPips = pipSize > 0 ? rewardDistance / pipSize : 0;
    potentialProfit = rewardPips * pipValue * lotSize;
    riskRewardRatio = stopDistance > 0 ? rewardDistance / stopDistance : 0;
  }

  return {
    dollarRisk,
    stopDistance,
    stopPips,
    positionSize,
    lotSize,
    potentialProfit,
    riskRewardRatio,
    exceedsMaxRisk: riskPercent > maxRiskPercent,
  };
}

export function calculateSetupScore(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// ============================================================
// MOCK MARKET DATA PROVIDER
// Used during development when real API is unavailable
// ============================================================
import type { OHLCV, Timeframe, Ticker, MarketDataProvider } from "@/types/database";

const MOCK_SYMBOLS: Record<string, { base: number; volatility: number }> = {
  EURUSD: { base: 1.0850, volatility: 0.003 },
  GBPUSD: { base: 1.2720, volatility: 0.004 },
  USDJPY: { base: 149.50, volatility: 0.8 },
  XAUUSD: { base: 2320.0, volatility: 15 },
  BTCUSD: { base: 67000, volatility: 1500 },
  ETHUSD: { base: 3500, volatility: 80 },
  USDCHF: { base: 0.9020, volatility: 0.003 },
  AUDUSD: { base: 0.6480, volatility: 0.003 },
  NZDUSD: { base: 0.5980, volatility: 0.003 },
  USDCAD: { base: 1.3620, volatility: 0.004 },
};

function seedRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateOHLCV(
  symbol: string,
  timeframeMs: number,
  fromTs: number,
  count: number
): OHLCV[] {
  const conf = MOCK_SYMBOLS[symbol] ?? { base: 1.0, volatility: 0.01 };
  const candles: OHLCV[] = [];
  let price = conf.base;

  for (let i = 0; i < count; i++) {
    const seed = fromTs + i * 12345;
    const r1 = seedRandom(seed);
    const r2 = seedRandom(seed + 1);
    const r3 = seedRandom(seed + 2);
    const r4 = seedRandom(seed + 3);
    const r5 = seedRandom(seed + 4);

    const open = price;
    const move = (r1 - 0.5) * conf.volatility;
    const close = open + move;
    const high = Math.max(open, close) + r2 * conf.volatility * 0.5;
    const low = Math.min(open, close) - r3 * conf.volatility * 0.5;
    const volume = Math.floor(r4 * 5000 + 1000);

    candles.push({
      time: Math.floor((fromTs + i * timeframeMs) / 1000),
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(high.toFixed(5)),
      low: parseFloat(low.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
      volume,
    });
    price = close + (r5 - 0.49) * conf.volatility * 0.1;
  }
  return candles;
}

const TF_MS: Record<Timeframe, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "30m": 1_800_000,
  "1H": 3_600_000,
  "4H": 14_400_000,
  "1D": 86_400_000,
  "1W": 604_800_000,
};

export class MockMarketDataProvider implements MarketDataProvider {
  isAvailable() {
    return true;
  }

  async fetchOHLCV(symbol: string, timeframe: Timeframe, limit = 200): Promise<OHLCV[]> {
    const tfMs = TF_MS[timeframe] ?? 3_600_000;
    const now = Date.now();
    const fromTs = now - limit * tfMs;
    return generateOHLCV(symbol, tfMs, fromTs, limit);
  }

  async fetchTicker(symbol: string): Promise<Ticker | null> {
    const conf = MOCK_SYMBOLS[symbol];
    if (!conf) return null;
    const r = seedRandom(Date.now() / 10000 + symbol.charCodeAt(0));
    const change = (r - 0.5) * conf.volatility * 2;
    const price = conf.base + change;
    return {
      symbol,
      displayName: symbol.slice(0, 3) + "/" + symbol.slice(3),
      price,
      change,
      changePercent: (change / conf.base) * 100,
      high: price + Math.abs(change) * 0.5,
      low: price - Math.abs(change) * 0.5,
      category: symbol.includes("BTC") || symbol.includes("ETH") ? "crypto" : "forex",
      isMock: true,
    };
  }

  async fetchTickers(symbols: string[]): Promise<Ticker[]> {
    return (await Promise.all(symbols.map((s) => this.fetchTicker(s)))).filter(
      (t): t is Ticker => t !== null
    );
  }
}
