"use client";

import { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine, PieChart, Pie, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import type { SimulatedTrade } from "@/types/database";
import { calculateSimStats, filterSimByPeriod } from "@/lib/calculations/trade-stats";
import { TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react";

interface Props {
  trades: SimulatedTrade[];
  currency: string;
}

function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function StatCard({
  title, value, sub, trend,
}: { title: string; value: string; sub?: string; trend?: "up" | "down" | "neutral" }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className={cn(
        "text-xl font-bold tabular-nums",
        trend === "up" && "text-profit",
        trend === "down" && "text-loss",
      )}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

export function PerformanceDashboard({ trades, currency }: Props) {
  const [period, setPeriod] = useState<"week" | "month" | "all">("all");

  const liveTrades = useMemo(() => trades.filter((t) => !t.is_backtest), [trades]);
  const periodTrades = useMemo(() => filterSimByPeriod(liveTrades, period), [liveTrades, period]);
  const closed = useMemo(() => periodTrades.filter((t) => t.result !== "pending"), [periodTrades]);
  const stats = useMemo(() => calculateSimStats(closed), [closed]);

  // Cumulative P/L curve
  const pnlCurve = useMemo(() => {
    const sorted = [...closed].sort(
      (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
    );
    let cumulative = 0;
    return sorted.map((t, i) => {
      cumulative += t.pnl ?? 0;
      return { trade: i + 1, pnl: parseFloat(cumulative.toFixed(2)), date: t.trade_date };
    });
  }, [closed]);

  // R-multiple distribution
  const rMultiples = useMemo(() =>
    closed
      .filter((t) => t.r_multiple != null)
      .map((t) => ({ r: t.r_multiple!, result: t.result, date: t.trade_date }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((t, i) => ({ i: i + 1, r: parseFloat(t.r.toFixed(2)), result: t.result })),
    [closed]
  );

  // Win/Loss by instrument
  const byInstrument = useMemo(() => {
    const map: Record<string, { wins: number; losses: number; breakeven: number }> = {};
    for (const t of closed) {
      if (!map[t.instrument]) map[t.instrument] = { wins: 0, losses: 0, breakeven: 0 };
      if (t.result === "win") map[t.instrument].wins++;
      else if (t.result === "loss") map[t.instrument].losses++;
      else map[t.instrument].breakeven++;
    }
    return Object.entries(map)
      .map(([symbol, v]) => ({ symbol, ...v, total: v.wins + v.losses + v.breakeven }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [closed]);

  // Pie data
  const pieData = [
    { name: "Wins", value: stats.wins, color: "hsl(var(--profit))" },
    { name: "Losses", value: stats.losses, color: "hsl(var(--loss))" },
    { name: "Breakeven", value: stats.breakeven, color: "hsl(var(--muted-foreground))" },
  ].filter((d) => d.value > 0);

  const sym = currency === "USD" ? "$" : "";

  if (closed.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
        <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium">No simulation data yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Log some simulated trades in the Trade Simulator to see your performance analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-1">
        {(["week", "month", "all"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors",
              period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            )}
          >{p === "all" ? "All Time" : `This ${p}`}</button>
        ))}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Total Trades" value={String(stats.totalTrades)} sub={`${stats.wins}W · ${stats.losses}L · ${stats.breakeven}BE`} />
        <StatCard title="Win Rate" value={`${fmt(stats.winRate, 1)}%`} trend={stats.winRate >= 50 ? "up" : "down"} />
        <StatCard title="Profit Factor" value={stats.profitFactor > 0 ? fmt(stats.profitFactor) : "—"} trend={stats.profitFactor >= 1.5 ? "up" : stats.profitFactor > 0 ? "neutral" : "neutral"} />
        <StatCard title="Total P/L" value={`${stats.totalPnL >= 0 ? "+" : ""}${sym}${fmt(Math.abs(stats.totalPnL))}`} trend={stats.totalPnL >= 0 ? "up" : "down"} />
        <StatCard title="Avg R" value={stats.avgR !== 0 ? `${stats.avgR >= 0 ? "+" : ""}${fmt(stats.avgR)}R` : "—"} trend={stats.avgR > 0 ? "up" : "down"} />
        <StatCard title="Expectancy" value={stats.expectancy !== 0 ? `${stats.expectancy >= 0 ? "+" : ""}${sym}${fmt(Math.abs(stats.expectancy))}` : "—"} trend={stats.expectancy >= 0 ? "up" : "down"} />
        <StatCard title="Avg Win" value={stats.avgWin > 0 ? `${sym}${fmt(stats.avgWin)}` : "—"} trend="up" />
        <StatCard title="Max Drawdown" value={stats.maxDrawdown > 0 ? `-${sym}${fmt(stats.maxDrawdown)}` : "—"} trend={stats.maxDrawdown > 0 ? "down" : "neutral"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Cumulative P/L */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Cumulative P/L</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={pnlCurve}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--profit))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--profit))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="trade" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${sym}${v}`} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: unknown) => { const n = Number(v); return [`${n >= 0 ? "+" : ""}${sym}${fmt(Math.abs(n))}`, "P/L"]; }} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Area type="monotone" dataKey="pnl" stroke="hsl(var(--profit))" fill="url(#pnlGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Win/Loss Pie */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Result Distribution</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* R-Multiple bars */}
      {rMultiples.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">R-Multiple per Trade</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={rMultiples} barSize={Math.max(4, Math.min(20, 400 / rMultiples.length))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="i" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}R`} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: unknown) => { const n = Number(v); return [`${n >= 0 ? "+" : ""}${fmt(n)}R`, "R Multiple"]; }} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Bar dataKey="r" radius={[2, 2, 0, 0]}>
                {rMultiples.map((entry, i) => (
                  <Cell key={i} fill={entry.r >= 0 ? "hsl(var(--profit))" : "hsl(var(--loss))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* By Instrument */}
      {byInstrument.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Trades by Instrument</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byInstrument} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis dataKey="symbol" type="category" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} width={60} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="wins" stackId="a" fill="hsl(var(--profit))" name="Wins" />
              <Bar dataKey="losses" stackId="a" fill="hsl(var(--loss))" name="Losses" />
              <Bar dataKey="breakeven" stackId="a" fill="hsl(var(--muted-foreground))" name="Breakeven" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
