"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO, subDays } from "date-fns";
import type { SimulatedTrade } from "@/types/database";

const PROFIT_COLOR = "#22c55e";
const LOSS_COLOR = "#ef4444";
const MUTED = "#71717a";

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (active && payload && payload.length) {
    const v = payload[0].value;
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-sm">
        <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
        <p className={`font-semibold tabular-nums ${v >= 0 ? "text-profit" : "text-loss"}`}>
          {v >= 0 ? "+" : ""}${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
}

export function SimulationCharts({ trades }: { trades: SimulatedTrade[] }) {
  const closed = useMemo(
    () => trades.filter((t) => t.result !== "pending" && t.pnl != null),
    [trades]
  );

  // 30-day cumulative P/L curve
  const equityCurve = useMemo(() => {
    const cutoff = subDays(new Date(), 30);
    const recent = closed
      .filter((t) => new Date(t.trade_date) >= cutoff)
      .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

    let cum = 0;
    return recent.map((t) => {
      cum += t.pnl ?? 0;
      return {
        date: format(parseISO(t.trade_date), "MMM d"),
        equity: Math.round(cum * 100) / 100,
      };
    });
  }, [closed]);

  // Weekly P/L bars
  const weeklyPnL = useMemo(() => {
    const byWeek: Record<string, number> = {};
    for (const t of closed) {
      const d = parseISO(t.trade_date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d);
      weekStart.setDate(diff);
      const key = format(weekStart, "MMM d");
      byWeek[key] = (byWeek[key] ?? 0) + (t.pnl ?? 0);
    }
    return Object.entries(byWeek)
      .slice(-12)
      .map(([week, pnl]) => ({ week, pnl: Math.round(pnl * 100) / 100 }));
  }, [closed]);

  if (closed.length < 2) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Cumulative P/L */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            30-Day Cumulative P/L
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={equityCurve} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PROFIT_COLOR} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={PROFIT_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tick={{ fill: MUTED, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: MUTED, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke={MUTED} strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="equity"
                stroke={PROFIT_COLOR}
                strokeWidth={2}
                fill="url(#equityGrad)"
                dot={false}
                activeDot={{ r: 4, fill: PROFIT_COLOR }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Weekly P/L bars */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Weekly P/L
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyPnL} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="week"
                tick={{ fill: MUTED, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: MUTED, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke={MUTED} />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {weeklyPnL.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? PROFIT_COLOR : LOSS_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
