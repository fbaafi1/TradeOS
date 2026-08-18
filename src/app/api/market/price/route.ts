import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.TWELVEDATA_API_KEY!;
const BASE = "https://api.twelvedata.com";

const SYMBOL_MAP: Record<string, string> = {
  EURUSD: "EUR/USD", GBPUSD: "GBP/USD", USDJPY: "USD/JPY",
  USDCHF: "USD/CHF", AUDUSD: "AUD/USD", NZDUSD: "NZD/USD",
  USDCAD: "USD/CAD", GBPJPY: "GBP/JPY", EURJPY: "EUR/JPY",
  EURGBP: "EUR/GBP", XAUUSD: "XAU/USD", XAGUSD: "XAG/USD",
  BTCUSD: "BTC/USD", ETHUSD: "ETH/USD", SOLUSD: "SOL/USD",
  US30: "DJI", SPX500: "SPX", NAS100: "NDX",
};

function toTwelveSymbol(sym: string) {
  return SYMBOL_MAP[sym.toUpperCase()] ?? sym;
}

// GET /api/market/price?symbol=EURUSD
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const tdSymbol = toTwelveSymbol(symbol);

  const url = new URL(`${BASE}/quote`);
  url.searchParams.set("symbol", tdSymbol);
  url.searchParams.set("apikey", API_KEY);

  try {
    const res = await fetch(url.toString(), {
      // No cache — always fresh for the live ticker
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: `TwelveData: ${res.status}` }, { status: res.status });
    }

    const json = await res.json();
    if (json.status === "error") {
      return NextResponse.json({ error: json.message }, { status: 400 });
    }

    const price = parseFloat(json.close ?? json.price ?? "0");
    const open = parseFloat(json.open ?? json.previous_close ?? price.toString());
    const change = price - open;
    const changePercent = open !== 0 ? (change / open) * 100 : 0;

    return NextResponse.json({
      symbol,
      price,
      change,
      changePercent,
      high: parseFloat(json.fifty_two_week?.high ?? json.high ?? price.toString()),
      low: parseFloat(json.fifty_two_week?.low ?? json.low ?? price.toString()),
      name: json.name ?? symbol,
      exchange: json.exchange ?? "",
      timestamp: json.timestamp,
    });
  } catch (err) {
    console.error("[market/price]", err);
    return NextResponse.json({ error: "Failed to fetch price" }, { status: 500 });
  }
}
