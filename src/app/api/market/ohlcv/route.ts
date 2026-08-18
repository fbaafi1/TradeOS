import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.TWELVEDATA_API_KEY!;
const BASE = "https://api.twelvedata.com";

// ── Symbol normalisation ───────────────────────────────────────────────────
// TwelveData uses slash notation for pairs and specific codes for indices
const SYMBOL_MAP: Record<string, string> = {
  // Forex
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  USDCHF: "USD/CHF",
  AUDUSD: "AUD/USD",
  NZDUSD: "NZD/USD",
  USDCAD: "USD/CAD",
  GBPJPY: "GBP/JPY",
  EURJPY: "EUR/JPY",
  EURGBP: "EUR/GBP",
  AUDJPY: "AUD/JPY",
  CADJPY: "CAD/JPY",
  CHFJPY: "CHF/JPY",
  EURAUD: "EUR/AUD",
  GBPAUD: "GBP/AUD",
  GBPCAD: "GBP/CAD",
  // Metals
  XAUUSD: "XAU/USD",
  XAGUSD: "XAG/USD",
  // Crypto
  BTCUSD: "BTC/USD",
  ETHUSD: "ETH/USD",
  SOLUSD: "SOL/USD",
  BNBUSD: "BNB/USD",
  XRPUSD: "XRP/USD",
  // Indices
  US30: "DJI",
  SPX500: "SPX",
  NAS100: "NDX",
  DAX40: "DAX",
  FTSE100: "UK100",
};

// Timeframe map: app format → TwelveData format
const TF_MAP: Record<string, string> = {
  "1m": "1min",
  "5m": "5min",
  "15m": "15min",
  "30m": "30min",
  "1H": "1h",
  "4H": "4h",
  "1D": "1day",
  "1W": "1week",
};

function toTwelveSymbol(sym: string): string {
  return SYMBOL_MAP[sym.toUpperCase()] ?? sym;
}

// ── /api/market/ohlcv ─────────────────────────────────────────────────────
// GET ?symbol=EURUSD&timeframe=1H&limit=250
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbol = searchParams.get("symbol");
  const timeframe = searchParams.get("timeframe") ?? "1H";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "250"), 500);

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const tdSymbol = toTwelveSymbol(symbol);
  const tdInterval = TF_MAP[timeframe] ?? "1h";

  const url = new URL(`${BASE}/time_series`);
  url.searchParams.set("symbol", tdSymbol);
  url.searchParams.set("interval", tdInterval);
  url.searchParams.set("outputsize", String(limit));
  url.searchParams.set("format", "JSON");
  url.searchParams.set("apikey", API_KEY);

  try {
    const res = await fetch(url.toString(), {
      // Cache for a short time to avoid hammering the API on hot reloads
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `TwelveData error: ${res.status}` },
        { status: res.status }
      );
    }

    const json = await res.json();

    // TwelveData returns { status: "error", message: "..." } on bad requests
    if (json.status === "error") {
      return NextResponse.json({ error: json.message }, { status: 400 });
    }

    // Transform to our OHLCVBar format { time, open, high, low, close, volume }
    const values: Array<{
      datetime: string;
      open: string;
      high: string;
      low: string;
      close: string;
      volume?: string;
    }> = json.values ?? [];

    // TwelveData returns newest-first — reverse to oldest-first for the chart
    const bars = values
      .reverse()
      .map((v) => ({
        time: Math.floor(new Date(v.datetime).getTime() / 1000),
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
        volume: v.volume ? parseFloat(v.volume) : 0,
      }))
      .filter((b) => !isNaN(b.open)); // drop any bad rows

    return NextResponse.json({ symbol, timeframe, bars });
  } catch (err) {
    console.error("[market/ohlcv]", err);
    return NextResponse.json({ error: "Failed to fetch market data" }, { status: 500 });
  }
}
