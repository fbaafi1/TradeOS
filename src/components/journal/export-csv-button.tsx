"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Trade } from "@/types/database";

export function ExportCsvButton({ trades }: { trades: Trade[] }) {
  function handleExport() {
    const headers = [
      "Date",
      "Instrument",
      "Direction",
      "Session",
      "Result",
      "Entry Price",
      "Stop Loss",
      "Take Profit",
      "Exit Price",
      "Lot Size",
      "Risk %",
      "Risk Amount",
      "P&L",
      "R Multiple",
      "R:R Ratio",
      "Timeframe",
      "HTF Bias",
      "Reason",
      "What Went Well",
      "What Went Wrong",
      "Lesson Learned",
    ];

    const rows = trades.map((t) => [
      t.trade_date ?? "",
      t.instrument ?? "",
      t.direction ?? "",
      t.session ?? "",
      t.result ?? "",
      t.entry_price ?? "",
      t.stop_loss ?? "",
      t.take_profit ?? "",
      t.exit_price ?? "",
      t.lot_size ?? "",
      t.risk_percentage ?? "",
      t.risk_amount ?? "",
      t.pnl ?? "",
      t.r_multiple ?? "",
      t.risk_reward_ratio ?? "",
      t.timeframe ?? "",
      t.htf_bias ?? "",
      (t.reason_for_entry ?? "").replace(/"/g, '""'),
      (t.what_went_well ?? "").replace(/"/g, '""'),
      (t.what_went_wrong ?? "").replace(/"/g, '""'),
      (t.lesson_learned ?? "").replace(/"/g, '""'),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tradeos-journal-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={trades.length === 0}>
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
}
